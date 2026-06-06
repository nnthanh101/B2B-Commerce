"use server"

import { sdk } from "@/lib/config"
import { getAuthHeaders } from "@/lib/data/cookies"

export type CreateInviteInput = {
  email: string
  spending_limit?: number | null
}

export type CreateInviteResult = {
  invite: {
    id: string
    email: string
    company_id: string
    expires_at: string
  }
  token_display: string
}

export type AcceptInviteInput = {
  token: string
  password: string
  first_name?: string
  last_name?: string
}

export type AcceptInviteResult = {
  success: boolean
  customer_id: string
  employee_id: string
}

/** POST /store/invites — admin creates an invite (requires session auth) */
export const createInvite = async (
  data: CreateInviteInput
): Promise<CreateInviteResult> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<CreateInviteResult>(`/store/invites`, {
    method: "POST",
    body: data,
    headers,
  })
}

/** GET /store/invites/accept?token=<raw_token> — validate without consuming.
 *
 * Uses native fetch with AbortSignal.timeout(4000) to enforce a 4-second
 * hard deadline. This prevents the RSC page from hanging for 30s when the
 * backend is slow or temporarily unreachable (e.g., container cold-start).
 *
 * On timeout or any network error: returns { valid: true } so the accept
 * form renders. The authoritative validation happens on the POST endpoint
 * when the user submits the form.
 */
export const validateInviteToken = async (
  token: string
): Promise<{ valid: boolean }> => {
  const MEDUSA_URL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

  try {
    const url = `${MEDUSA_URL}/store/invites/accept?token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUB_KEY,
      },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    })
    if (!res.ok) {
      return { valid: false }
    }
    return (await res.json()) as { valid: boolean }
  } catch {
    // Timeout or network error — render form optimistically.
    // POST /store/invites/accept provides the authoritative check.
    return { valid: true }
  }
}

/** POST /store/invites/accept — public endpoint, no auth required */
export const acceptInvite = async (
  data: AcceptInviteInput
): Promise<AcceptInviteResult> => {
  return sdk.client.fetch<AcceptInviteResult>(`/store/invites/accept`, {
    method: "POST",
    body: data,
  })
}
