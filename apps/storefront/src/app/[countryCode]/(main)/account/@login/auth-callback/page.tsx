// Force dynamic rendering so revalidateTag() runs in a live request context,
// not during static-page generation (Next.js 15 restriction).
export const dynamic = "force-dynamic"

import { handleKeycloakCallback } from "@/lib/data/customer"
import { Text } from "@medusajs/ui"

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Keycloak SSO callback page (KC-3).
 *
 * URL: /{countryCode}/account/auth-callback?code=...&state=...
 *
 * Round-trip:
 *   1. Storefront calls sdk.auth.login("customer","vymalo-keycloak",{})
 *      → Medusa returns { location: "<keycloak-authorize-url>" }
 *   2. Browser is hard-navigated to that URL (window.location.href in login component).
 *   3. Keycloak authenticates the user, then redirects to:
 *        http://localhost:9000/auth/customer/vymalo-keycloak/callback?code=...&state=...
 *      Medusa backend validates the code with Keycloak and redirects to the
 *      storefront default_redirect_uri with code+state forwarded, landing here.
 *   4. This page calls sdk.auth.callback("customer","vymalo-keycloak",{code,state})
 *      → returns a JWT token.
 *   5. Token is persisted to _medusa_jwt cookie (same as emailpass login).
 *   6. Cache tags are revalidated, cart is transferred, customer is redirected
 *      to /{countryCode}/account.
 *
 * HITL-gated prerequisites for the live round-trip:
 *   - Backend .env: KEYCLOAK_* vars (realm, client_id, client_secret, url)
 *   - Backend .env: MEDUSA_VYMALO_KEYCLOAK_DEFAULT_REDIRECT_URI pointing to
 *       http://localhost:8000/{countryCode}/account/auth-callback
 *   - /etc/hosts: 127.0.0.1  keycloak  (Docker service DNS)
 *   Without these, Medusa returns an error before this page is ever reached.
 */
export default async function AuthCallbackPage({ params, searchParams }: Props) {
  const { countryCode } = await params
  const query = await searchParams

  const code = Array.isArray(query.code) ? query.code[0] : query.code
  const state = Array.isArray(query.state) ? query.state[0] : query.state
  // scope is required by @vymalo/medusa-keycloak validateCallback.
  // Keycloak does not include scope in the redirect URL, so fall back to the
  // configured default scope. If scope is present (e.g. for other OIDC providers), use it.
  const scope = Array.isArray(query.scope) ? query.scope[0] : (query.scope ?? "openid profile email")

  if (!code || !state) {
    return (
      <div
        className="max-w-sm w-full h-full flex flex-col justify-center gap-4 my-auto"
        data-testid="sso-callback-error"
      >
        <Text className="text-2xl text-neutral-950">SSO login failed</Text>
        <Text className="text-neutral-600">
          Missing required parameters from the SSO provider. Please try again.
        </Text>
        <a
          href={`/${countryCode}/account`}
          className="text-sm text-neutral-900 underline"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  // handleKeycloakCallback sets the _medusa_jwt cookie, revalidates cache tags,
  // transfers the cart, and calls redirect() — so this function never returns
  // normally; Next.js throws the NEXT_REDIRECT special error to handle navigation.
  try {
    await handleKeycloakCallback(code, state, countryCode, scope)
  } catch (error: unknown) {
    // NEXT_REDIRECT is thrown by redirect() — rethrow it so Next.js handles it.
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "NEXT_REDIRECT"
    ) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : "Unknown SSO error"

    return (
      <div
        className="max-w-sm w-full h-full flex flex-col justify-center gap-4 my-auto"
        data-testid="sso-callback-error"
      >
        <Text className="text-2xl text-neutral-950">SSO login failed</Text>
        <Text className="text-neutral-600">{message}</Text>
        <a
          href={`/${countryCode}/account`}
          className="text-sm text-neutral-900 underline"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  // redirect() above always throws NEXT_REDIRECT before we reach this line.
  return null
}
