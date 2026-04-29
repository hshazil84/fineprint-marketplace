export const PLATFORM_FEE_PCT = 5
export const HANDLING_FEE     = 100
export const COMMISSION_PCT   = 5

export const PRINTING_FEES: Record<string, number> = {
  'A4':    200,
  'A3':    350,
  'A2':    500,
  '12x16': 450,
}

export const SIZES = ['A4', 'A3']

export const SIZE_DIMENSIONS: Record<string, string> = {
  'A4':    '210 × 297 mm',
  'A3':    '297 × 420 mm',
  'A2':    '420 × 594 mm',
  '12x16': '305 × 406 mm',
}

export const DEFAULT_PAPER = 'Photo Luster'

export function formatMVR(amount: number): string {
  return `MVR ${amount.toLocaleString()}`
}

export function buildOrderSKU(artworkSKU: string, size: string): string {
  return `${artworkSKU}-${size.replace(/[^A-Za-z0-9]/g, '')}`
}

// ─── Price calculation ───────────────────────────────────────────────────────
// Artist enters the amount they WANT TO RECEIVE.
// Platform fee (5%) is added ON TOP of artist price.
// artistEarnings = artistPrice (exactly what they entered)
// grossPrice     = artistPrice + 5% of artistPrice
// buyer pays     = grossPrice + printingFee + paperAddOn + handlingFee

export interface PriceBreakdown {
  artistPrice:     number
  grossPrice:      number
  platformFeePct:  number
  platformFeeAmt:  number
  artistEarnings:  number
  printSize:       string
  printingFee:     number
  paperAddOn:      number
  totalPrintFee:   number
  paperType:       string
  deliveryMethod:  'delivery' | 'pickup'
  handlingFee:     number
  artworkLineItem: number
  totalPaid:       number
  offerLabel:      string | null
  offerPct:        number
  discountAmount:  number
  fpTotal:         number
  originalPrice:   number
  printPrice:      number
  fpCommission:    number
}

export function calculatePrices(
  artistPrice:    number,
  offerPct:       number = 0,
  offerLabel:     string | null = null,
  deliveryMethod: 'delivery' | 'pickup' = 'delivery',
  printSize:      string = 'A4',
  paperType:      string = DEFAULT_PAPER,
  paperAddOnAmt:  number = 0,
): PriceBreakdown {
  // Platform fee added on top — artist receives exactly artistPrice
  const platformFeeAmt = Math.round(artistPrice * PLATFORM_FEE_PCT / 100)
  const grossPrice     = artistPrice + platformFeeAmt
  const artistEarnings = artistPrice

  // Apply offer discount on gross price
  const discountAmount     = Math.round(grossPrice * offerPct / 100)
  const discountedGross    = grossPrice - discountAmount
  const discountedEarnings = Math.round(discountedGross * (100 - PLATFORM_FEE_PCT) / 100)

  const printingFee     = PRINTING_FEES[printSize] || PRINTING_FEES['A4']
  const totalPrintFee   = printingFee + paperAddOnAmt
  const handlingFee     = deliveryMethod === 'delivery' ? HANDLING_FEE : 0
  const artworkLineItem = discountedGross + totalPrintFee
  const totalPaid       = artworkLineItem + handlingFee
  const fpTotal         = platformFeeAmt + totalPrintFee + handlingFee

  return {
    artistPrice,
    grossPrice,
    platformFeePct:  PLATFORM_FEE_PCT,
    platformFeeAmt,
    artistEarnings:  offerPct > 0 ? discountedEarnings : artistEarnings,
    printSize,
    printingFee,
    paperAddOn:      paperAddOnAmt,
    totalPrintFee,
    paperType,
    deliveryMethod,
    handlingFee,
    artworkLineItem,
    totalPaid,
    offerLabel,
    offerPct,
    discountAmount,
    fpTotal,
    originalPrice:  grossPrice,
    printPrice:     discountedGross,
    fpCommission:   platformFeeAmt,
  }
}

export function getFromPrice(
  artistPrice:    number,
  sizes:          string[],
  offerPct:       number = 0,
  paperAddOnFn?:  (size: string) => number,
): number {
  if (!sizes || sizes.length === 0) sizes = ['A4']
  const platformFeeAmt  = Math.round(artistPrice * PLATFORM_FEE_PCT / 100)
  const grossPrice      = artistPrice + platformFeeAmt
  const discountedGross = grossPrice - Math.round(grossPrice * offerPct / 100)
  const lowestPrintFee  = Math.min(...sizes.map(s => {
    const base  = PRINTING_FEES[s] || PRINTING_FEES['A4']
    const addOn = paperAddOnFn ? paperAddOnFn(s) : 0
    return base + addOn
  }))
  return discountedGross + lowestPrintFee
}

// Legacy compat — returns 0, callers should use usePapers().getPaperAddOn()
export function getPaperAddOn(paperType: string, printSize: string): number {
  return 0
}
