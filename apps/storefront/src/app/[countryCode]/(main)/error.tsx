"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[storefront] SSR error boundary caught:", error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-950 mb-4">
          Something went wrong
        </h1>
        <p className="text-neutral-500 mb-6">
          An unexpected error occurred. Please try again or return to the store.
          {error.digest && (
            <span className="block mt-2 text-xs text-neutral-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2 bg-neutral-950 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2 border border-neutral-300 text-neutral-950 text-sm font-medium rounded-md hover:bg-neutral-50 transition-colors"
          >
            Go to store
          </Link>
        </div>
      </div>
    </div>
  )
}
