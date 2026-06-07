"use client"

import { acceptInvite } from "@/lib/data/invites"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"

type AcceptState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string }

type Props = { token: string; isValidToken: boolean }

const AcceptInviteForm = ({ token, isValidToken }: Props) => {
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [state, setState] = useState<AcceptState>({ status: "idle" })

  /** No token or invalid/expired token — show a clear, actionable message */
  if (!token || !isValidToken) {
    return (
      <Container className="p-8 text-center">
        <Heading level="h1" className="text-2xl font-semibold text-neutral-950 mb-4">
          Invalid Invite Link
        </Heading>
        <Text className="text-neutral-500 mb-6">
          This invite link is invalid or has expired. Please check the link in
          your email and try again, or ask your company admin to resend the
          invite.
        </Text>
        <LocalizedClientLink href="/account" className="text-blue-600 underline">
          Go to sign in
        </LocalizedClientLink>
      </Container>
    )
  }

  if (state.status === "success") {
    return (
      <Container className="p-8 text-center">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <Heading level="h1" className="text-2xl font-semibold text-neutral-950">
            Account Ready
          </Heading>
          <Text className="text-neutral-500">
            Your employee account has been created. Sign in with your email and
            the password you just set.
          </Text>
          <LocalizedClientLink
            href="/account"
            className="mt-2 inline-flex items-center justify-center px-6 py-2 bg-neutral-950 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
          >
            Sign in
          </LocalizedClientLink>
        </div>
      </Container>
    )
  }

  const validatePassword = (value: string): boolean => {
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return false
    }
    setPasswordError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePassword(password)) return

    setState({ status: "loading" })
    try {
      await acceptInvite({
        token,
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      })
      setState({ status: "success" })
    } catch (err: any) {
      const raw: string = err?.message ?? "Something went wrong. Please try again."

      // Map backend error messages to user-friendly copy
      let message = raw
      if (raw.includes("expired")) {
        message =
          "This invite link has expired. Ask your company admin to send a new invite."
      } else if (raw.includes("already been used")) {
        message =
          "This invite has already been used. If you already have an account, sign in below."
      } else if (raw.includes("Invalid") || raw.includes("invalid")) {
        message =
          "This invite link is not valid. Please check the link in your email."
      }

      setState({ status: "error", message })
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <Heading level="h1" className="text-2xl font-semibold text-neutral-950 mb-1">
          Accept Invite
        </Heading>
        <Text className="text-neutral-500 text-sm">
          Set a password to create your employee account.
        </Text>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-2 gap-4 p-6 border-b border-neutral-200"
      >
        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">First Name</Text>
          <Input
            name="first_name"
            label="First name (optional)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-label="First name"
            autoComplete="given-name"
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">Last Name</Text>
          <Input
            name="last_name"
            label="Last name (optional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-label="Last name"
            autoComplete="family-name"
          />
        </div>

        <div className="flex flex-col gap-y-2 col-span-2">
          <Text className="font-medium text-neutral-950">
            Password <span aria-hidden="true" className="text-red-500">*</span>
          </Text>
          <Input
            name="password"
            label="Create a password (min. 8 characters)"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) validatePassword(e.target.value)
            }}
            onBlur={() => validatePassword(password)}
            aria-label="New account password"
            aria-describedby={passwordError ? "password-error" : undefined}
            aria-invalid={!!passwordError}
            autoComplete="new-password"
            required
          />
          {passwordError && (
            <Text
              id="password-error"
              role="alert"
              className="text-red-500 text-xs"
            >
              {passwordError}
            </Text>
          )}
        </div>

        {state.status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="col-span-2 rounded-md bg-red-50 border border-red-200 px-4 py-3"
          >
            <Text className="text-red-700 text-sm">{state.message}</Text>
            {state.message.includes("already have an account") && (
              <LocalizedClientLink
                href="/account"
                className="text-red-700 underline text-sm mt-1 inline-block"
              >
                Sign in
              </LocalizedClientLink>
            )}
          </div>
        )}

        <div className="col-span-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={state.status === "loading"}
            disabled={state.status === "loading"}
            aria-label="Accept invite and create account"
          >
            {state.status === "loading" ? "Creating account..." : "Accept Invite"}
          </Button>
        </div>
      </form>

      <div className="px-6 py-4 bg-neutral-50 flex items-center justify-center">
        <Text className="text-neutral-400 text-xs text-center">
          Already have an account?{" "}
          <LocalizedClientLink href="/account" className="text-neutral-600 underline">
            Sign in
          </LocalizedClientLink>
        </Text>
      </div>
    </Container>
  )
}

export default AcceptInviteForm
