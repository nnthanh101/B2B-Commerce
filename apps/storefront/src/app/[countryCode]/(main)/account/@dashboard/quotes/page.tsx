import { retrieveCustomer } from "@/lib/data/customer"
import { fetchQuotes } from "@/lib/data/quotes"
import { Heading } from "@medusajs/ui"
import { notFound } from "next/navigation"
import QuotesOverview from "./components/quotes-overview"

export default async function Quotes() {
  const customer = await retrieveCustomer()
  if (!customer) {
    notFound()
  }

  const { quotes } = await fetchQuotes()

  return (
    <div className="w-full" data-testid="quotes-page-wrapper">
      <div className="mb-4">
        <Heading>Quotes</Heading>
      </div>

      <div>
        <QuotesOverview quotes={quotes!} />
      </div>
    </div>
  )
}
