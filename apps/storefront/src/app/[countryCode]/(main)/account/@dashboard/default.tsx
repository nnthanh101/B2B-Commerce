// default.tsx for the @dashboard parallel-route slot.
//
// Next.js requires every parallel-route slot to have either a page.tsx or
// default.tsx for each URL segment. When a URL matches @login/page.tsx but
// has no corresponding @dashboard/page.tsx, Next.js falls back to this file.
//
// Returning null is correct here — the parent layout.tsx controls which slot
// renders based on customer auth state.
export default function DashboardDefault() {
  return null
}
