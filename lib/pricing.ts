export const PLATFORM_FEE_PCT = 5
export const HANDLING_FEE = 100
export const COMMISSION_PCT = 5

export const PRINTING_FEES: Record<string, number> = {
  'A4':  200,
  'A3':  350,
  'A2':  500,
  '12x16': 450,
}

export const SIZES = ['A4', 'A3']

export interface PriceBreakdown {
  artistPrice: number
  platformFeePct: number
  platformFeeAmt: number
  artistEarnings: number
  printSize: string
  printingFee: number
  deliveryMethod: 'delivery' | 'pickup'
  handlingFee: number
  artworkLineItem: number
  totalPaid: number
  offerLabel: string | null
  offerPct: number
  discountAmount: number
  fpTotal: number
  originalPrice: number
  printPrice: number
  fpCommission: number
}

export function calculatePrices(
  artistPrice: number,
  offerPct: number = 0,
  offerLabel: string | null = null,
  deliveryMethod: 'delivery' | 'pickup' = 'delivery',
  printSize: string = 'A4',
): PriceBreakdown {
  const discountAmount  = Math.round(artistPrice * offerPct / 100)
  const discountedPrice = artistPrice - discountAmount
  const platformFeeAmt  = Math.round(discountedPrice * PLATFORM_FEE_PCT / 100)
  const artistEarnings  = discountedPrice - platformFeeAmt
  const printingFee     = PRINTING_FEES[printSize] || PRINTING_FEES['A4']
  const handlingFee     = deliveryMethod === 'delivery' ? HANDLING_FEE : 0
  const artworkLineItem = discountedPrice + printingFee
  const totalPaid       = artworkLineItem + handlingFee
  const fpTotal         = platformFeeAmt + printingFee + handlingFee

  return {
    artistPrice, platformFeePct: PLATFORM_FEE_PCT, platformFeeAmt,
    artistEarnings, printSize, printingFee, deliveryMethod, handlingFee,
    artworkLineItem, totalPaid, offerLabel, offerPct, discountAmount, fpTotal,
    originalPrice: artistPrice, printPrice: discountedPrice, fpCommission: platformFeeAmt,
  }
}

export function formatMVR(amount: number): string {
  return `MVR ${amount.toLocaleString()}`
}

export function buildOrderSKU(artworkSKU: string, size: string): string {
  return `${artworkSKU}-${size.replace(/[^A-Za-z0-9]/g, '')}`
}
