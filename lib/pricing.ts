// ─────────────────────────────────────────────
// FINEPRINT PRICING UTILITIES
// ─────────────────────────────────────────────

export const COMMISSION_PCT = 25        // FinePrint takes 25% of original price
export const HANDLING_FEE = 100         // MVR 100 delivery fee (pass-through, not revenue)

export interface PriceBreakdown {
  originalPrice: number
  offerLabel: string | null
  offerPct: number
  discountAmount: number
  printPrice: number        // after discount
  handlingFee: number       // 100 for delivery, 0 for pickup
  totalPaid: number
  fpCommission: number      // always 25% of originalPrice
  artistEarnings: number    // printPrice - fpCommission
}

export function calculatePrices(
  originalPrice: number,
  offerPct: number = 0,
  offerLabel: string | null = null,
  deliveryMethod: 'delivery' | 'pickup' = 'delivery'
): PriceBreakdown {
  const discountAmount = Math.round(originalPrice * offerPct / 100)
  const printPrice = originalPrice - discountAmount
  const handlingFee = deliveryMethod === 'delivery' ? HANDLING_FEE : 0
  const totalPaid = printPrice + handlingFee
  const fpCommission = Math.round(originalPrice * COMMISSION_PCT / 100)
  const artistEarnings = printPrice - fpCommission

  return {
    originalPrice,
    offerLabel,
    offerPct,
    discountAmount,
    printPrice,
    handlingFee,
    totalPaid,
    fpCommission,
    artistEarnings,
  }
}

export function formatMVR(amount: number): string {
  return `MVR ${amount.toLocaleString()}`
}

// Generate order SKU from artwork SKU + size
// e.g. FP-AN-001 + A3 → FP-AN-001-A3
export function buildOrderSKU(artworkSKU: string, size: string): string {
  return `${artworkSKU}-${size.replace(/[^A-Za-z0-9]/g, '')}`
}
