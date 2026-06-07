import { validateInviteToken } from "@/lib/data/invites"
import AcceptInviteForm from "./accept-invite-form"

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ token?: string }>
}

/**
 * RSC page: /[countryCode]/invite/accept?token=<raw_token>
 *
 * The token comes from a link emailed to the new employee.
 * This page is fully public (no auth required).
 *
 * Server-side token validation: if the token is missing or invalid,
 * the form receives isValidToken=false and renders the error state immediately.
 */
export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams

  // Validate the token server-side before rendering the form.
  // An empty/missing token is immediately invalid; a non-empty token is checked
  // against the backend (invalid, expired, or already-used all result in false).
  let isValidToken = false
  if (token) {
    const result = await validateInviteToken(token)
    isValidToken = result.valid
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <AcceptInviteForm token={token ?? ""} isValidToken={isValidToken} />
      </div>
    </div>
  )
}
