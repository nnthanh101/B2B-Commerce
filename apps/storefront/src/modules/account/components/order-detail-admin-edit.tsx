"use client"

import { convertToLocale } from "@/lib/util/money"
import { sdk } from "@/lib/config"
import { getAuthHeaders } from "@/lib/data/cookies"
import Button from "@/modules/common/components/button"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

type LineItemDraft = {
  id: string
  quantity: number
}

type OrderDetailAdminEditProps = {
  order: HttpTypes.StoreOrder
}

const validateQty = (qty: number): string | null => {
  if (!Number.isInteger(qty) || qty < 1) return "Quantity must be a whole number ≥ 1"
  return null
}

const handleSave = async (
  orderId: string,
  drafts: LineItemDraft[]
): Promise<HttpTypes.StoreOrder> => {
  "use server"
  const headers = await getAuthHeaders()

  const { order } = await sdk.client.fetch<{ order: HttpTypes.StoreOrder }>(
    `/store/orders/${orderId}/edits`,
    {
      method: "POST",
      body: { items: drafts },
      headers,
    }
  )

  return order
}

const OrderDetailAdminEdit = ({ order }: OrderDetailAdminEditProps) => {
  const [drafts, setDrafts] = useState<Record<string, number>>(
    () =>
      Object.fromEntries((order.items ?? []).map((item) => [item.id, item.quantity]))
  )
  const [isLoading, setIsLoading] = useState(false)

  const isDirty = (order.items ?? []).some(
    (item) => drafts[item.id] !== item.quantity
  )

  const handleQtyChange = (itemId: string, raw: string) => {
    const parsed = parseInt(raw, 10)
    setDrafts((prev) => ({ ...prev, [itemId]: isNaN(parsed) ? 0 : parsed }))
  }

  const handleSubmit = async () => {
    const changedItems = (order.items ?? [])
      .filter((item) => drafts[item.id] !== item.quantity)
      .map((item) => ({ id: item.id, quantity: drafts[item.id] }))

    for (const item of changedItems) {
      const err = validateQty(item.quantity)
      if (err) {
        toast.error(err)
        return
      }
    }

    setIsLoading(true)
    try {
      await handleSave(order.id, changedItems)
      toast.success("Order quantities updated")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update order")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setDrafts(
      Object.fromEntries((order.items ?? []).map((item) => [item.id, item.quantity]))
    )
  }

  return (
    <Container className="p-0 overflow-hidden" data-testid="order-edit-panel">
      <div className="p-4 border-b border-neutral-200">
        <Heading level="h3" className="text-base font-semibold text-neutral-950">
          Edit Order #{order.display_id}
        </Heading>
      </div>

      <div className="flex flex-col divide-y divide-neutral-100">
        {(order.items ?? []).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 p-4"
            data-testid={`order-edit-item-${item.id}`}
          >
            <div className="flex flex-col gap-y-0.5 flex-1 min-w-0">
              <Text className="font-medium text-neutral-950 truncate">
                {item.product_title}
              </Text>
              {item.variant?.title && (
                <Text className="text-xs text-ui-fg-subtle">{item.variant.title}</Text>
              )}
              <Text className="text-xs text-ui-fg-subtle">
                {convertToLocale({
                  amount: item.unit_price,
                  currency_code: order.currency_code,
                })}{" "}
                / unit
              </Text>
            </div>

            <div className="flex items-center gap-x-2 shrink-0">
              <label
                htmlFor={`qty-${item.id}`}
                className="text-xs text-ui-fg-subtle sr-only"
              >
                Quantity for {item.product_title}
              </label>
              <input
                id={`qty-${item.id}`}
                type="number"
                min={1}
                step={1}
                value={drafts[item.id] ?? item.quantity}
                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                disabled={isLoading}
                className="w-16 border border-neutral-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50"
                data-testid={`qty-input-${item.id}`}
              />
            </div>
          </div>
        ))}
      </div>

      {isDirty && (
        <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4 border-t border-neutral-200">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={isLoading}
            data-testid="order-edit-reset"
          >
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading}
            data-testid="order-edit-save"
          >
            Save Changes
          </Button>
        </div>
      )}
    </Container>
  )
}

export default OrderDetailAdminEdit
