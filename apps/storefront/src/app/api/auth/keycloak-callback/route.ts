/**
 * Keycloak SSO OAuth callback — Route Handler (Next.js 15).
 *
 * Why a Route Handler, not a Page:
 *   Next.js 15 forbids cookies.set() and revalidateTag() during Server Component
 *   render. Moving the OAuth exchange to a Route Handler (GET /api/auth/keycloak-callback)
 *   satisfies the framework constraint while keeping the auth logic server-side.
 *
 * Flow:
 *   1. Keycloak redirects browser to /api/auth/keycloak-callback?code=...&state=...
 *   2. This handler calls sdk.auth.callback() → gets JWT token
 *   3. Sets _medusa_jwt cookie via NextResponse.cookies
 *   4. Schedules cache revalidation via after()
 *   5. Redirects to /{countryCode}/account (default: /nz/account)
 *
 * KEYCLOAK_CALLBACK_URL in docker-compose.yml must match this path:
 *   http://localhost:8000/api/auth/keycloak-callback
 *
 * Keycloak client redirect URIs in realm-export.json include http://localhost:8000/*
 * which covers this path — no realm config change needed.
 */

import { sdk } from "@/lib/config"
import { after } from "next/server"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { B2BCustomer } from "@/types/global"

// Country code default — matches KEYCLOAK_CALLBACK_URL base path
const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "nz"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl

  const code = searchParams.get("code") ?? undefined
  const state = searchParams.get("state") ?? undefined
  const scope = searchParams.get("scope") ?? "openid profile email"

  // Missing params — redirect back to login page with error
  if (!code || !state) {
    const errorUrl = new URL(`/${DEFAULT_COUNTRY}/account`, request.url)
    errorUrl.searchParams.set("sso_error", "missing_params")
    return NextResponse.redirect(errorUrl)
  }

  let token: string

  try {
    const result = await sdk.auth.callback("customer", "vymalo-keycloak", {
      code,
      state,
      scope,
    })

    if (typeof result !== "string") {
      throw new Error("Unexpected MFA response from SSO callback")
    }

    token = result
  } catch (err: unknown) {
    const message = err instanceof Error ? encodeURIComponent(err.message) : "sso_error"
    const errorUrl = new URL(`/${DEFAULT_COUNTRY}/account`, request.url)
    errorUrl.searchParams.set("sso_error", message)
    return NextResponse.redirect(errorUrl)
  }

  // Build the success redirect response
  const redirectUrl = new URL(`/${DEFAULT_COUNTRY}/account`, request.url)
  const response = NextResponse.redirect(redirectUrl)

  // Set the JWT cookie on the response (Route Handler — cookies mutation allowed)
  // NOTE: sameSite="lax" (not "strict") is required because this handler is reached
  // via a cross-site redirect chain (Keycloak → our domain). SameSite=Strict cookies
  // are blocked in this scenario in some browsers. Lax allows same-site navigations
  // and cross-site top-level GET navigations (which this redirect is).
  response.cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  console.log(`[keycloak-callback] token=${token.slice(0, 20)}... setting cookie, redirecting to ${redirectUrl.toString()}`)
  console.log(`[keycloak-callback] Set-Cookie headers: ${JSON.stringify(response.headers.get("set-cookie"))}`)

  // Fetch customer for company_id (needed for cart metadata) — direct SDK call, no cache
  const authHeaders = { authorization: `Bearer ${token}` }
  let customer = await sdk.client
    .fetch<{ customer: B2BCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: { fields: "*employee, *orders" },
      headers: authHeaders,
    })
    .then(({ customer }) => customer as B2BCustomer)
    .catch(() => null)

  // Auto-provision: Medusa v2 auth.callback creates an auth_identity but does NOT
  // create the customer record. If the customer doesn't exist yet (401 → null),
  // create it now and link it to the auth identity via sdk.store.customer.create().
  if (!customer) {
    try {
      // Decode the JWT payload to extract user info (no signature verification
      // needed — the token was just issued by the backend in this same request).
      const payloadB64 = token.split(".")[1]
      const payload = payloadB64
        ? JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
        : {}

      const newCustomer = await sdk.store.customer
        .create(
          {
            email: payload.email ?? "",
            first_name: payload.given_name ?? payload.name?.split(" ")[0] ?? "",
            last_name: payload.family_name ?? payload.name?.split(" ").slice(1).join(" ") ?? "",
          },
          {},
          authHeaders
        )
        .then(({ customer }) => customer as B2BCustomer)
        .catch(() => null)

      customer = newCustomer
    } catch {
      // Non-fatal: auto-provision failure redirects to account page where
      // Medusa's own "complete registration" flow can run.
    }
  }

  // Update cart company_id if employee is linked to a company
  if (customer?.employee?.company_id) {
    try {
      const cartIdCookie = request.cookies.get("_medusa_cart_id")?.value
      if (cartIdCookie) {
        await sdk.store.cart.update(
          cartIdCookie,
          {
            metadata: {
              company_id: customer.employee.company_id,
            },
          },
          {},
          authHeaders
        )
      }
    } catch {
      // Non-fatal: cart metadata update failure does not block SSO login
    }
  }

  // Defer cache invalidation to after() — safe in Route Handler context
  after(async () => {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value
    if (cacheId) {
      revalidateTag(`customers-${cacheId}`)
      revalidateTag(`products-${cacheId}`)
      revalidateTag(`carts-${cacheId}`)
    }
  })

  return response
}
