export const formatAmount = (amount: number | null | undefined, currency_code: string) => {
  if (amount == null || isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency_code || "USD",
  }).format(amount);
};
