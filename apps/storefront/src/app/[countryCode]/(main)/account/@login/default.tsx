// default.tsx for the @login parallel-route slot.
//
// Next.js requires a default.tsx (or page.tsx) in every slot for every URL
// that has a sibling page.tsx in another slot. Without this file, navigating
// to /account/orders or /account/quotes causes a __next_error__ because Next.js
// cannot resolve the @login slot for those sub-paths.
//
// Returning null tells Next.js "this slot has no content for this path" —
// the parent account/layout.tsx then renders only the @dashboard slot.
export default function LoginDefault() {
  return null
}
