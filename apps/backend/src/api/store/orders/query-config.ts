export const orderFields = [
  "id",
  "status",
  "total",
  "subtotal",
  "tax_total",
  "item_total",
  "customer_id",
  "currency_code",
  "created_at",
  "updated_at",
  "*items",
  "items.id",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.title",
  "items.variant_id",
  "*items.variant",
  "*items.variant.product",
];

export const retrieveOrderTransformQueryConfig = {
  defaults: orderFields,
  isList: false,
};
