"use client"

import { addToCartBulk } from "@/lib/data/cart"
import { resolveSkusToVariants } from "@/lib/data/products"
import Button from "@/modules/common/components/button"
import { Text } from "@medusajs/ui"
import { useParams } from "next/navigation"
import { useState } from "react"

type LineStatus =
  | { state: "pending" }
  | { state: "resolved"; variantId: string }
  | { state: "unknown_sku"; sku: string }
  | { state: "malformed"; raw: string }

type ParsedLine = {
  raw: string
  sku: string
  quantity: number
  status: LineStatus
}

/** Parse a single text line of the form  "SKU,QTY"  or  "SKU\tQTY". */
function parseLine(raw: string): ParsedLine | null {
  const trimmed = raw.trim()
  if (!trimmed) return null // blank line — skip silently

  // Accept comma or tab as delimiter
  const parts = trimmed.split(/[,\t]/).map((p) => p.trim())

  if (parts.length < 2) {
    return {
      raw: trimmed,
      sku: "",
      quantity: 0,
      status: { state: "malformed", raw: trimmed },
    }
  }

  const sku = parts[0].toUpperCase()
  const qty = parseInt(parts[1], 10)

  if (!sku || isNaN(qty) || qty <= 0) {
    return {
      raw: trimmed,
      sku,
      quantity: 0,
      status: { state: "malformed", raw: trimmed },
    }
  }

  return { raw: trimmed, sku, quantity: qty, status: { state: "pending" } }
}

const QuickOrderPad = () => {
  const { countryCode } = useParams()
  const [text, setText] = useState("")
  const [lines, setLines] = useState<ParsedLine[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [addedCount, setAddedCount] = useState<number | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleAdd = async () => {
    setGlobalError(null)
    setAddedCount(null)

    const parsed: ParsedLine[] = []
    for (const raw of text.split("\n")) {
      const line = parseLine(raw)
      if (line) parsed.push(line)
    }

    if (parsed.length === 0) {
      setGlobalError("No valid lines found. Enter lines as SKU,quantity.")
      setLines([])
      return
    }

    setLines(parsed)

    const validLines = parsed.filter((l) => l.status.state === "pending")
    const skus = validLines.map((l) => l.sku)

    let skuMap: Map<string, string>
    try {
      skuMap = await resolveSkusToVariants(skus)
    } catch (e: any) {
      setGlobalError(`SKU resolution failed: ${e?.message ?? "unknown error"}`)
      return
    }

    // Annotate each line with resolution result
    const annotated: ParsedLine[] = parsed.map((line) => {
      if (line.status.state !== "pending") return line
      const variantId = skuMap.get(line.sku)
      return {
        ...line,
        status: variantId
          ? { state: "resolved" as const, variantId }
          : { state: "unknown_sku" as const, sku: line.sku },
      }
    })

    setLines(annotated)

    const toAdd = annotated.filter(
      (l): l is ParsedLine & { status: { state: "resolved"; variantId: string } } =>
        l.status.state === "resolved"
    )

    if (toAdd.length === 0) {
      setGlobalError("None of the SKUs could be resolved. Check SKU spelling.")
      return
    }

    setIsAdding(true)
    try {
      await addToCartBulk({
        lineItems: toAdd.map((l) => ({
          variant_id: (l.status as { state: "resolved"; variantId: string }).variantId,
          quantity: l.quantity,
        })),
        countryCode: countryCode as string,
      })
      setAddedCount(toAdd.length)
    } catch (e: any) {
      setGlobalError(`Failed to add to cart: ${e?.message ?? "unknown error"}`)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Text className="text-sm font-medium text-neutral-950">Quick Order</Text>
      <Text className="text-xs text-neutral-500">
        Paste SKUs — one per line, format: <code>SKU,quantity</code>
      </Text>
      <textarea
        className="w-full h-28 rounded-md border border-neutral-300 bg-white p-2 text-sm font-mono text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
        placeholder={"ACME-MONITOR-WHITE,2\nWEBCAM-BLACK,1"}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setLines([])
          setAddedCount(null)
          setGlobalError(null)
        }}
        data-testid="quick-order-textarea"
      />
      <Button
        className="w-full h-10 rounded-full shadow-borders-base"
        variant="secondary"
        onClick={handleAdd}
        isLoading={isAdding}
        disabled={!text.trim() || isAdding}
        data-testid="quick-order-add-btn"
      >
        Add to Cart
      </Button>

      {globalError && (
        <Text className="text-xs text-red-500" data-testid="quick-order-global-error">
          {globalError}
        </Text>
      )}

      {addedCount !== null && !globalError && (
        <Text className="text-xs text-green-600" data-testid="quick-order-success">
          {addedCount} line{addedCount !== 1 ? "s" : ""} added to cart.
        </Text>
      )}

      {lines.length > 0 && (
        <div className="flex flex-col gap-y-1" data-testid="quick-order-line-statuses">
          {lines.map((line, i) => {
            const { status } = line

            if (status.state === "malformed") {
              return (
                <div key={i} className="flex items-start gap-x-2 text-xs">
                  <span className="text-red-500 mt-0.5">!</span>
                  <span className="text-red-500">
                    Invalid line: <code>{status.raw}</code> — expected SKU,quantity
                  </span>
                </div>
              )
            }

            if (status.state === "unknown_sku") {
              return (
                <div key={i} className="flex items-start gap-x-2 text-xs" data-testid={`quick-order-unknown-${line.sku}`}>
                  <span className="text-orange-500 mt-0.5">?</span>
                  <span className="text-orange-500">
                    Unknown SKU: <code>{line.sku}</code>
                  </span>
                </div>
              )
            }

            if (status.state === "resolved") {
              return (
                <div key={i} className="flex items-start gap-x-2 text-xs" data-testid={`quick-order-ok-${line.sku}`}>
                  <span className="text-green-600 mt-0.5">&#10003;</span>
                  <span className="text-green-700">
                    <code>{line.sku}</code> &times; {line.quantity}
                  </span>
                </div>
              )
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}

export default QuickOrderPad
