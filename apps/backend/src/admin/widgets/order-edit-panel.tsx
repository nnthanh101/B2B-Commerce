import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ArrowUturnLeft,
  PencilSquare,
  Plus,
  XCircle,
  XMark,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Heading,
  IconButton,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import {
  useAddItemsToQuote,
  useConfirmQuote,
  useOrderPreview,
  useRemoveQuoteItem,
  useUpdateAddedQuoteItem,
  useUpdateQuoteItem,
} from "../hooks/api"
import { formatAmount } from "../utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderEditPanelProps = {
  data: HttpTypes.AdminOrder
}

type EditableItemProps = {
  orderId: string
  originalItem: HttpTypes.AdminOrder["items"][0] | undefined
  item: HttpTypes.AdminOrderPreview["items"][0]
  currencyCode: string
}

// ---------------------------------------------------------------------------
// EditableItem — mirrors manage-item.tsx logic but without the price override
// form (KISS: focused panel for demo reel flow-08)
// ---------------------------------------------------------------------------

function EditableItem({
  orderId,
  originalItem,
  item,
  currencyCode,
}: EditableItemProps) {
  const [showQtyInput, setShowQtyInput] = useState(false)
  const [pendingQty, setPendingQty] = useState<string>(
    String(item.quantity)
  )

  // Reuse exact same hooks from quotes.tsx
  const { mutateAsync: updateAddedItem, isPending: isUpdatingAdded } =
    useUpdateAddedQuoteItem(orderId)
  const { mutateAsync: updateOriginalItem, isPending: isUpdatingOriginal } =
    useUpdateQuoteItem(orderId)
  const { mutateAsync: undoAction, isPending: isRemoving } =
    useRemoveQuoteItem(orderId)

  const isUpdating = isUpdatingAdded || isUpdatingOriginal

  // Mirrors manage-item.tsx action detection
  const addItemAction = useMemo(
    () => item.actions?.find((a) => a.action === "ITEM_ADD"),
    [item]
  )
  const updateItemAction = useMemo(
    () => item.actions?.find((a) => a.action === "ITEM_UPDATE"),
    [item]
  )
  const isAddedItem = !!addItemAction
  const isItemUpdated = !!updateItemAction
  const isItemRemoved =
    !!updateItemAction &&
    item.quantity === item.detail.fulfilled_quantity

  // Mirrors manage-item.tsx onUpdate handler
  const handleUpdateQty = async () => {
    const quantity = parseInt(pendingQty, 10)
    if (isNaN(quantity) || quantity < 0) return
    if (quantity <= item.detail.fulfilled_quantity) {
      toast.error("Quantity cannot be lower than fulfilled quantity")
      return
    }

    try {
      if (addItemAction) {
        await updateAddedItem({ quantity, actionId: addItemAction.id })
      } else {
        await updateOriginalItem({ quantity, itemId: item.id })
      }
      setShowQtyInput(false)
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update quantity"
      )
    }
  }

  // Mirrors manage-item.tsx onRemove handler
  const handleRemove = async () => {
    try {
      if (addItemAction) {
        await undoAction(addItemAction.id)
      } else {
        await updateOriginalItem({
          quantity: item.detail.fulfilled_quantity,
          itemId: item.id,
        })
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove item")
    }
  }

  // Mirrors manage-item.tsx onRemoveUndo handler
  const handleUndoRemove = async () => {
    try {
      if (updateItemAction) {
        await undoAction(updateItemAction.id)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to undo remove")
    }
  }

  return (
    <div className="bg-ui-bg-subtle shadow-elevation-card-rest my-2 rounded-xl">
      <div className="flex flex-col gap-y-2 p-3 text-sm md:flex-row md:items-center md:gap-x-2">
        {/* Item info */}
        <div className="flex flex-1 items-center gap-x-3">
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <div className="flex flex-col">
            <Text className="txt-small" as="span" weight="plus">
              {item.title}
              {item.variant_sku && (
                <span className="text-ui-fg-muted font-normal">
                  {" "}
                  ({item.variant_sku})
                </span>
              )}
            </Text>
            {item.product_title && (
              <Text as="div" className="text-ui-fg-subtle txt-small">
                {item.product_title}
              </Text>
            )}
          </div>
          <div className="ml-auto flex gap-1">
            {isAddedItem && (
              <Badge size="2xsmall" rounded="full" color="blue">
                New
              </Badge>
            )}
            {isItemRemoved ? (
              <Badge size="2xsmall" rounded="full" color="red">
                Removed
              </Badge>
            ) : (
              isItemUpdated && (
                <Badge size="2xsmall" rounded="full" color="orange">
                  Modified
                </Badge>
              )
            )}
          </div>
        </div>

        {/* Qty + total + actions */}
        <div className="flex items-center gap-x-3">
          {showQtyInput ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="w-[70px] text-sm"
                value={pendingQty}
                min={item.detail.fulfilled_quantity + 1}
                onChange={(e) => setPendingQty(e.target.value)}
                autoFocus
              />
              <Button
                size="small"
                variant="primary"
                disabled={isUpdating}
                onClick={handleUpdateQty}
              >
                OK
              </Button>
              <IconButton
                size="small"
                variant="transparent"
                onClick={() => {
                  setShowQtyInput(false)
                  setPendingQty(String(item.quantity))
                }}
              >
                <XMark className="text-ui-fg-muted" />
              </IconButton>
            </div>
          ) : (
            <Text className="txt-small text-ui-fg-subtle">
              {item.quantity}×{" "}
              {formatAmount(item.unit_price, currencyCode)}
            </Text>
          )}

          <Text className="txt-small text-ui-fg-base min-w-[80px] text-right">
            {formatAmount(item.total, currencyCode)}
            {originalItem && originalItem.total !== item.total && (
              <span className="text-ui-fg-subtle ml-1 line-through">
                {formatAmount(originalItem.total, currencyCode)}
              </span>
            )}
          </Text>

          {/* Action buttons */}
          <div className="flex gap-1">
            {!isItemRemoved && (
              <IconButton
                size="small"
                variant="transparent"
                title="Edit quantity"
                disabled={item.detail.fulfilled_quantity === item.quantity}
                onClick={() => {
                  setShowQtyInput(true)
                  setPendingQty(String(item.quantity))
                }}
              >
                <PencilSquare className="text-ui-fg-muted" />
              </IconButton>
            )}
            {!isItemRemoved ? (
              <IconButton
                size="small"
                variant="transparent"
                title="Remove item"
                disabled={
                  isRemoving ||
                  item.detail.fulfilled_quantity === item.quantity
                }
                onClick={handleRemove}
              >
                <XCircle className="text-ui-fg-muted" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                variant="transparent"
                title="Undo remove"
                disabled={isRemoving}
                onClick={handleUndoRemove}
              >
                <ArrowUturnLeft className="text-ui-fg-muted" />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddItemRow — inline variant-id input for adding a new item
// ---------------------------------------------------------------------------

function AddItemRow({
  orderId,
  onAdded,
}: {
  orderId: string
  onAdded: () => void
}) {
  const [variantId, setVariantId] = useState("")
  const [qty, setQty] = useState("1")

  const { mutateAsync: addItems, isPending } = useAddItemsToQuote(orderId)

  const handleAdd = async () => {
    const trimmed = variantId.trim()
    const quantity = parseInt(qty, 10)
    if (!trimmed || isNaN(quantity) || quantity < 1) {
      toast.error("Provide a valid variant ID and quantity")
      return
    }
    try {
      await addItems({ items: [{ variant_id: trimmed, quantity }] })
      setVariantId("")
      setQty("1")
      onAdded()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add item")
    }
  }

  return (
    <div className="border-ui-border-base mt-3 flex items-center gap-2 rounded-lg border p-3">
      <Input
        placeholder="Variant ID"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
        className="flex-1 text-sm"
      />
      <Input
        type="number"
        placeholder="Qty"
        value={qty}
        min={1}
        onChange={(e) => setQty(e.target.value)}
        className="w-[70px] text-sm"
      />
      <Button
        size="small"
        variant="secondary"
        disabled={isPending || !variantId.trim()}
        onClick={handleAdd}
      >
        {isPending ? "Adding…" : "Add"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderEditPanel — main widget
// ---------------------------------------------------------------------------

function OrderEditPanel({ data: order }: OrderEditPanelProps) {
  const [showAddRow, setShowAddRow] = useState(false)

  // useOrderPreview gives us the live change-preview for the order
  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    order.id
  )

  // useConfirmQuote reuses sdk.admin.orderEdit.request (same surface)
  const { mutateAsync: confirmEdit, isPending: isConfirming } =
    useConfirmQuote(order.id)

  const originalItemsMap = useMemo(
    () => new Map((order.items ?? []).map((i) => [i.id, i])),
    [order.items]
  )

  const handleConfirm = async () => {
    try {
      await confirmEdit()
      toast.success("Order edit confirmed")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm edit")
    }
  }

  if (isPreviewLoading) {
    return (
      <div className="bg-ui-bg-base border-ui-border-base rounded-xl border p-6">
        <div className="bg-ui-bg-subtle h-4 w-32 animate-pulse rounded" />
      </div>
    )
  }

  if (!preview) {
    return null
  }

  const hasChanges =
    (preview.items ?? []).some(
      (i) => (i.actions ?? []).length > 0
    )

  return (
    <div className="bg-ui-bg-base border-ui-border-base rounded-xl border p-6">
      {/* Panel header */}
      <div className="mb-4 flex items-center justify-between">
        <Heading level="h2">Edit Order</Heading>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setShowAddRow((v) => !v)}
        >
          <Plus className="mr-1" />
          Add item
        </Button>
      </div>

      {/* Add-item row */}
      {showAddRow && (
        <AddItemRow
          orderId={order.id}
          onAdded={() => setShowAddRow(false)}
        />
      )}

      {/* Item list */}
      <div className="mt-2">
        {(preview.items ?? []).map((item) => (
          <EditableItem
            key={item.id}
            orderId={order.id}
            originalItem={originalItemsMap.get(item.id)}
            item={item}
            currencyCode={order.currency_code}
          />
        ))}
      </div>

      {/* Totals */}
      <div className="border-ui-border-base mt-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Text className="txt-small text-ui-fg-subtle">Current total</Text>
          <Text className="txt-small text-ui-fg-subtle">
            {formatAmount(order.total, order.currency_code)}
          </Text>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Text className="txt-small text-ui-fg-base font-medium">
            New total
          </Text>
          <Text className="txt-small text-ui-fg-base font-medium">
            {formatAmount(preview.total, order.currency_code)}
          </Text>
        </div>
      </div>

      {/* Confirm */}
      {hasChanges && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            size="small"
            disabled={isConfirming}
            onClick={handleConfirm}
          >
            {isConfirming ? "Confirming…" : "Confirm edit"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default OrderEditPanel

export const config = defineWidgetConfig({
  zone: "order.details.after",
})
