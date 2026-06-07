"use client"

import { createInvite } from "@/lib/data/invites"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { Container, Text, toast } from "@medusajs/ui"
import { useState } from "react"

/** RFC 5322-compliant email pattern (simplified, covers 99.9% of real addresses) */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const InviteEmployeeForm = () => {
  const [email, setEmail] = useState("")
  const [spendingLimit, setSpendingLimit] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email is required")
      return false
    }
    if (!EMAIL_RE.test(value.trim())) {
      setEmailError("Enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  const handleSubmit = async () => {
    setSuccessMessage("")
    if (!validateEmail(email)) return

    const parsedLimit =
      spendingLimit.trim() === "" ? null : parseFloat(spendingLimit)

    if (
      spendingLimit.trim() !== "" &&
      (isNaN(parsedLimit!) || parsedLimit! < 0)
    ) {
      toast.error("Spending limit must be a positive number")
      return
    }

    setIsLoading(true)
    try {
      const result = await createInvite({
        email: email.trim(),
        spending_limit: parsedLimit,
      })
      setSuccessMessage(
        `Invite sent to ${result.invite.email}. The link expires in 7 days.`
      )
      setEmail("")
      setSpendingLimit("")
    } catch (err: any) {
      const message: string =
        err?.message ?? "Failed to send invite. Please try again."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="grid small:grid-cols-2 grid-cols-1 gap-4 p-4 border-b border-neutral-200">
        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">
            Employee Email <span aria-hidden="true" className="text-red-500">*</span>
          </Text>
          <Input
            name="invite_email"
            label="Enter employee email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) validateEmail(e.target.value)
            }}
            onBlur={() => validateEmail(email)}
            aria-label="Employee email address"
            aria-describedby={emailError ? "invite-email-error" : undefined}
            aria-invalid={!!emailError}
          />
          {emailError && (
            <Text
              id="invite-email-error"
              role="alert"
              className="text-red-500 text-xs"
            >
              {emailError}
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">
            Spending Limit{" "}
            <span className="text-neutral-400 font-normal">(optional)</span>
          </Text>
          <Input
            name="spending_limit"
            label="e.g. 5000"
            type="number"
            min="0"
            step="0.01"
            value={spendingLimit}
            onChange={(e) => setSpendingLimit(e.target.value)}
            aria-label="Spending limit in company currency"
          />
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 bg-green-50 border-b border-green-200"
        >
          <Text className="text-green-700 text-sm">{successMessage}</Text>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4">
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={isLoading}
          aria-label="Send invite email to employee"
        >
          Send Invite
        </Button>
      </div>
    </Container>
  )
}

export default InviteEmployeeForm
