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

// ─── Paper types ────────────────────────────────────────────────────────────

export interface PaperOption {
  name:        string
  category:    'Economic' | 'Photography' | 'Fine Art' | 'Industry Standard'
  description: string
  addOn:       Record<string, number>  // size → MVR add-on
}

export const PAPER_OPTIONS: PaperOption[] = [
  // Economic Photo Line
  {
    name:        'Photo Luster',
    category:    'Economic',
    description: 'Standard professional photography — pebble-grain luster finish',
    addOn:       { A4: 0, A3: 0, A2: 0, '12x16': 0 },
  },
  {
    name:        'Photo Matt Fibre',
    category:    'Economic',
    description: 'Budget posters and high-volume photo prints — smooth matt finish',
    addOn:       { A4: 0, A3: 0, A2: 0, '12x16': 0 },
  },

  // Photography High Range
  {
    name:        'Photo Rag Baryta',
    category:    'Photography',
    description: 'The Rolls Royce of photo papers — 100% cotton, premium high gloss',
    addOn:       { A4: 50, A3: 110, A2: 150, '12x16': 130 },
  },
  {
    name:        'FineArt Baryta',
    category:    'Photography',
    description: 'Black & white photography — legendary Onyx blacks, α-cellulose',
    addOn:       { A4: 45, A3: 100, A2: 140, '12x16': 120 },
  },

  // Watercolour & Fine Art
  {
    name:        'William Turner',
    category:    'Fine Art',
    description: 'Watercolour reproductions — authentic texture, economic weight',
    addOn:       { A4: 25, A3: 45, A2: 70, '12x16': 60 },
  },
  {
    name:        'Albrecht Dürer',
    category:    'Fine Art',
    description: 'Authentic textured art prints — heavier weight, fine art feel',
    addOn:       { A4: 35, A3: 65, A2: 100, '12x16': 85 },
  },

  // Industry Standard
  {
    name:        'Photo Rag 308',
    category:    'Industry Standard',
    description: 'Highest quality archival fine art — 308gsm, museum grade',
    addOn:       { A4: 40, A3: 75, A2: 110, '12x16': 95 },
  },
]

export const DEFAULT_PAPER = 'Photo Luster'

// Get paper add-on for a specific paper + size
export function getPaperAddOn(paperType: string, printSize: string): number {
  const paper = PAPER_OPTIONS.find(p => p.name === paperType)
  if (!paper) return 0
  return paper.addOn[printSize] ?? 0
}

// Get paper option by name
export function getPaperOption(paperType: string): PaperOption | undefined {
  return PAPER_OPTIONS.find(p => p.name === paperType)
}

// Papers grouped by category for UI rendering
export function getPapersByCategory(): Record<string, PaperOption[]> {
  return PAPER_OPTIONS.reduce((acc, paper) => {
    if (!acc[paper.category]) acc[paper.category] = []
    acc[paper.category].push(paper)
    return acc
  }, {} as Record<string, PaperOption[]>)
}

// ─── Price calculation ───────────────────────────────────────────────────────

export interface PriceBreakdown {
  artistPrice:    number
  platformFeePct: number
  platformFeeAmt: number
  artistEarnings: number
  printSize:      string
  printingFee:    number       // base printing fee
  paperAddOn:     number       // paper upgrade add-on
  totalPrintFee:  number       // printingFee + paperAddOn
  paperType:      string
  deliveryMethod: 'delivery' | 'pickup'
  handlingFee:    number
  artworkLineItem: number
  totalPaid:      number
  offerLabel:     string | null
  offerPct:       number
  discountAmount: number
  fpTotal:        number
  originalPrice:  number
  printPrice:     number
  fpCommission:   number
}

export function calculatePrices(
  artistPrice:    number,
  offerPct:       number = 0,
  offerLabel:     string | null = null,
  deliveryMethod: 'delivery' | 'pickup' = 'delivery',
  printSize:      string = 'A4',
  paperType:      string = DEFAULT_PAPER,
): PriceBreakdown {
  const discountAmount  = Math.round(artistPrice * offerPct / 100)
  const discountedPrice = artistPrice - discountAmount
  const platformFeeAmt  = Math.round(discountedPrice * PLATFORM_FEE_PCT / 100)
  const artistEarnings  = discountedPrice - platformFeeAmt
  const printingFee     = PRINTING_FEES[printSize] || PRINTING_FEES['A4']
  const paperAddOn      = getPaperAddOn(paperType, printSize)
  const totalPrintFee   = printingFee + paperAddOn
  const handlingFee     = deliveryMethod === 'delivery' ? HANDLING_FEE : 0
  const artworkLineItem = discountedPrice + totalPrintFee
  const totalPaid       = artworkLineItem + handlingFee
  const fpTotal         = platformFeeAmt + totalPrintFee + handlingFee

  return {
    artistPrice,
    platformFeePct: PLATFORM_FEE_PCT,
    platformFeeAmt,
    artistEarnings,
    printSize,
    printingFee,
    paperAddOn,
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
    originalPrice:  artistPrice,
    printPrice:     discountedPrice,
    fpCommission:   platformFeeAmt,
  }
}

export function getFromPrice(
  artistPrice: number,
  sizes:       string[],
  offerPct:    number = 0,
  paperType:   string = DEFAULT_PAPER,
): number {
  if (!sizes || sizes.length === 0) sizes = ['A4']
  const discountedPrice   = artistPrice - Math.round(artistPrice * offerPct / 100)
  const lowestPrintingFee = Math.min(...sizes.map(s => {
    const base   = PRINTING_FEES[s] || PRINTING_FEES['A4']
    const addOn  = getPaperAddOn(paperType, s)
    return base + addOn
  }))
  return discountedPrice + lowestPrintingFee
}

export function formatMVR(amount: number): string {
  return `MVR ${amount.toLocaleString()}`
}

export function buildOrderSKU(artworkSKU: string, size: string): string {
  return `${artworkSKU}-${size.replace(/[^A-Za-z0-9]/g, '')}`
}
