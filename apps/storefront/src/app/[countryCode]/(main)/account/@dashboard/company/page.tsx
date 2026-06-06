import { retrieveCompany } from "@/lib/data/companies"
import { retrieveCustomer } from "@/lib/data/customer"
import { listRegions } from "@/lib/data/regions"
import ApprovalSettingsCard from "@/modules/account/components/approval-settings-card"
import CompanyCard from "@/modules/account/components/company-card"
import EmployeesCard from "@/modules/account/components/employees-card"
import InviteEmployeeCard from "@/modules/account/components/invite-employee-card"
import { Heading } from "@medusajs/ui"
export default async function Company() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  // Return null so the parent layout.tsx renders the @login slot instead.
  if (!customer || !customer?.employee?.company) return null

  const company = await retrieveCompany(customer.employee.company.id)

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col gap-y-4">
        <Heading level="h2" className="text-lg text-neutral-950">
          Company Details
        </Heading>
        <CompanyCard company={company} regions={regions} />
      </div>
      <div className="mb-8 flex flex-col gap-y-4">
        <Heading level="h2" className="text-lg text-neutral-950">
          Approval Settings
        </Heading>
        <ApprovalSettingsCard company={company} customer={customer} />
      </div>
      <div className="mb-8 flex flex-col gap-y-4">
        <Heading level="h2" className="text-lg text-neutral-950">
          Employees
        </Heading>
        <EmployeesCard company={company} />
      </div>
      <div className="mb-8 flex flex-col gap-y-4">
        <Heading level="h2" className="text-lg text-neutral-950">
          Invite Employees
        </Heading>
        <InviteEmployeeCard />
      </div>
    </div>
  )
}
