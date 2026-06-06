"use client"

import { createEmployee } from "@/lib/data/companies"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { QueryCompany } from "@/types"
import { Container, Text, toast } from "@medusajs/ui"
import { useState } from "react"

const InviteEmployeeCard = ({ company }: { company: QueryCompany }) => {
  const [customerId, setCustomerId] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInvite = async () => {
    if (!customerId.trim()) {
      toast.error("Customer ID is required")
      return
    }

    setIsLoading(true)
    try {
      await createEmployee({
        company_id: company.id,
        customer_id: customerId.trim(),
      })
      toast.success("Employee added successfully")
      setCustomerId("")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add employee")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="grid small:grid-cols-4 grid-cols-2 gap-4 p-4 border-b border-neutral-200">
        <div className="flex flex-col col-span-4 gap-y-2">
          <Text className="font-medium text-neutral-950">Customer ID</Text>
          <Input
            name="customer_id"
            label="Enter customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4">
        <Button
          variant="primary"
          onClick={handleInvite}
          isLoading={isLoading}
          disabled={isLoading}
        >
          Send Invite
        </Button>
      </div>
    </Container>
  )
}

export default InviteEmployeeCard
