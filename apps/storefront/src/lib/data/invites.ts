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

/** POST /store/invites/accept — public endpoint, no auth required */
export const acceptInvite = async (
  data: AcceptInviteInput
): Promise<AcceptInviteResult> => {
  return sdk.client.fetch<AcceptInviteResult>(`/store/invites/accept`, {
    method: "POST",
    body: data,
  })
}
