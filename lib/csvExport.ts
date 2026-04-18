// ─────────────────────────────────────────────
// CSV EXPORT UTILITIES
// ─────────────────────────────────────────────

export interface OrderRow {
  date: string
  invoiceNumber: string
  orderSku: string
  artworkTitle: string
  artistName?: string       // admin only
  buyerName?: string        // admin only
  buyerEmail?: string       // admin only
  printSize: string
  originalPrice: number
  offerLabel?: string
  offerPct?: number
  discountAmount?: number
  buyerPaid: number
  handlingFee: number
  fpCommission: number
  artistEarnings: number
  payoutStatus?: string     // admin only
  deliveryMethod: string
  status: string
}

// Artist CSV — their sales only, no buyer contact or commission details
export function generateArtistCSV(rows: OrderRow[], artistName: string): string {
  const header = [
    'date', 'invoice_number', 'order_sku', 'artwork_title', 'print_size',
    'original_price_mvr', 'offer_applied', 'offer_pct', 'discount_mvr',
    'buyer_paid_mvr', 'your_earnings_mvr', 'delivery_method', 'status'
  ].join(',')

  const lines = rows.map(r => [
    r.date,
    r.invoiceNumber,
    r.orderSku,
    `"${r.artworkTitle}"`,
    r.printSize,
    r.originalPrice,
    r.offerLabel ? `"${r.offerLabel}"` : '—',
    r.offerPct ? `${r.offerPct}%` : '—',
    r.discountAmount || 0,
    r.buyerPaid,
    r.artistEarnings,
    r.deliveryMethod,
    r.status,
  ].join(','))

  return [header, ...lines].join('\n')
}

// Admin CSV — full picture, all artists, all columns
export function generateAdminCSV(rows: OrderRow[]): string {
  const header = [
    'date', 'invoice_number', 'order_sku', 'artwork_title', 'artist_name',
    'buyer_name', 'buyer_email', 'print_size', 'original_price_mvr',
    'offer_applied', 'offer_pct', 'discount_mvr', 'buyer_paid_mvr',
    'handling_fee_mvr', 'fp_commission_mvr', 'artist_earnings_mvr',
    'payout_status', 'delivery_method', 'status'
  ].join(',')

  const lines = rows.map(r => [
    r.date,
    r.invoiceNumber,
    r.orderSku,
    `"${r.artworkTitle}"`,
    `"${r.artistName || ''}"`,
    `"${r.buyerName || ''}"`,
    r.buyerEmail || '',
    r.printSize,
    r.originalPrice,
    r.offerLabel ? `"${r.offerLabel}"` : '—',
    r.offerPct ? `${r.offerPct}%` : '—',
    r.discountAmount || 0,
    r.buyerPaid,
    r.handlingFee,
    r.fpCommission,
    r.artistEarnings,
    r.payoutStatus || 'unpaid',
    r.deliveryMethod,
    r.status,
  ].join(','))

  return [header, ...lines].join('\n')
}

// Trigger browser download of a CSV string
export function downloadCSVFile(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Format date range for filename e.g. "2026-01-01_to_2026-04-18"
export function dateRangeFilename(from: string, to: string, prefix: string): string {
  return `${prefix}_${from}_to_${to}.csv`
}
