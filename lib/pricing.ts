import { DEFAULT_PRINTING_FEES, DEFAULT_PLATFORM_FEE_PCT, DEFAULT_HANDLING_FEE } from '@/lib/settings'

// Re-export for convenience
export const PRINTING_FEES    = DEFAULT_PRINTING_FEES
export const PLATFORM_FEE_PCT = DEFAULT_PLATFORM_FEE_PCT
export const HANDLING_FEE     = DEFAULT_HANDLING_FEE

export const SIZE_DIMENSIONS: Record<string, string> = {
  'A4':    '21 × 29.7 cm',
  'A3':    '29.7 × 42 cm',
  'A2':    '42 × 59.4 cm',
  '12x16': '30.5 × 40.6 cm',
}

export function formatMVR(amount: number): string {
  return 'MVR ' + Math.round(amount).toLocaleString()
}

// Artist enters price = what they receive
// Platform fee added ON TOP → buyer pays more, artist gets exactly what they set
export function calculatePrices(
export function calculatePrices(
  artistPrice:    number,
  offerPct:       number      = 0,
  offerLabel:     string|null = null,
  deliveryMethod: string      = 'delivery',
  printSize:      string      = 'A4',
  _paperType:     string      = '',   // kept for API compatibility
  paperAddOnAmt:  number      = 0,
) {
  const printingFee     = (PRINTING_FEES[printSize] || PRINTING_FEES['A4']) + paperAddOnAmt
  const platformFeeAmt  = Math.round(artistPrice * PLATFORM_FEE_PCT / 100)
  const grossPrice      = artistPrice + platformFeeAmt  // buyer-facing artwork price before offer
  const discountAmount  = offerPct > 0 ? Math.round(grossPrice * offerPct / 100) : 0
  const discountedPrice = grossPrice - discountAmount
  const artworkLineItem = discountedPrice + printingFee
  const artistEarnings  = artistPrice                   // always exact

  return {
    artistPrice,
    platformFeeAmt,
    grossPrice,
    discountAmount,
    discountedPrice,
    printingFee,
    artworkLineItem,
    artistEarnings,
    offerLabel,
    offerPct,
  }
}

export function getFromPrice(
  artistPrice:  number,
  offerPct:     number = 0,
  paperAddOnFn: (size: string) => number = () => 0,
): number {
  const sizes     = Object.keys(PRINTING_FEES)
  const minSize   = sizes.reduce((min, s) =>
    (PRINTING_FEES[s] + paperAddOnFn(s)) < (PRINTING_FEES[min] + paperAddOnFn(min)) ? s : min
  )
  const prices    = calculatePrices(artistPrice, offerPct, null, 'delivery', minSize, paperAddOnFn(minSize))
  return prices.artworkLineItem
}

export const SIZES = ['A4', 'A3', 'A2', '12x16']

export function buildOrderSKU(artworkSku: string, printSize: string): string {
  return artworkSku + '-' + printSize
}
