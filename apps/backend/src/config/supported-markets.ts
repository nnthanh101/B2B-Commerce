/**
 * SUPPORTED_MARKETS — Single Source of Truth for OceanSoft's 6-market model.
 *
 * FX multipliers are DEMO-GRADE approximations only (not live rates).
 * They are used at seed time to derive multi-currency variant prices from a
 * USD base amount. Do NOT use these for production FX calculations.
 *
 * Each market maps to exactly one Medusa region + one currency.
 * VND amounts are integer-only; pricesFor() rounds all amounts via Math.round().
 */
export const SUPPORTED_MARKETS = [
  { iso2: "nz", currency: "nzd", name: "New Zealand",   locale: "en-NZ", fx: 1.65 },
  { iso2: "au", currency: "aud", name: "Australia",     locale: "en-AU", fx: 1.50 },
  { iso2: "sg", currency: "sgd", name: "Singapore",     locale: "en-SG", fx: 1.35 },
  { iso2: "vn", currency: "vnd", name: "Vietnam",       locale: "vi-VN", fx: 25000 },
  { iso2: "us", currency: "usd", name: "United States", locale: "en-US", fx: 1 },
  { iso2: "gb", currency: "gbp", name: "United Kingdom",locale: "en-GB", fx: 0.80 },
] as const

export const DEFAULT_MARKET = "nz"

/**
 * Derive prices for all 6 markets from a USD base amount.
 * Amounts are rounded integers — safe for VND (zero-decimal currency).
 */
export const pricesFor = (baseUsd: number) =>
  SUPPORTED_MARKETS.map((m) => ({
    currency_code: m.currency,
    amount: Math.round(baseUsd * m.fx),
  }))
