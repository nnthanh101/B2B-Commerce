import { Metadata } from "next"

import { retrieveCustomer } from "@/lib/data/customer"
import { listOrders } from "@/lib/data/orders"
import Overview from "@/modules/account/components/overview"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)
  const orders = await listOrders().catch(() => null)

  // Return null so the parent layout.tsx can render the @login slot instead.
  // Calling notFound() inside a parallel-route slot causes a segment-level 404.
  if (!customer) {
    return null
  }

  return <Overview customer={customer} orders={orders} />
}
