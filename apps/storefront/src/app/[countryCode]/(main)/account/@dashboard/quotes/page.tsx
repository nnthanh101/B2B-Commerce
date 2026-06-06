import { retrieveCustomer } from "@/lib/data/customer"
import { fetchQuotes } from "@/lib/data/quotes"
import { Heading } from "@medusajs/ui"
import QuotesOverview from "./components/quotes-overview"

export default async function Quotes() {
  const customer = await retrieveCustomer()

  // Return null so the parent layout.tsx can render the @login slot instead.
  // Calling notFound() inside a parallel-route slot causes a segment-level 404.
  if (!customer) {
    return null
  }

  const { quotes } = await fetchQuotes().catch(() => ({ quotes: [] }))

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
