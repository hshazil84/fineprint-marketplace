export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generateArtistCSV, generateAdminCSV, OrderRow } from '@/lib/csvExport'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from   = searchParams.get('from') || '2024-01-01'
    const to     = searchParams.get('to') || new Date().toISOString().split('T')[0]
    const artist = searchParams.get('artist') || 'all'
    const type   = searchParams.get('type') || 'artist'

    const supabase = createAdminClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, invoice_number, order_sku, print_size, original_price, offer_label, offer_pct, discount_amount, total_paid, handling_fee, fp_commission, artist_earnings, payout_status, delivery_method, status, buyer_name, buyer_email, artworks ( title, artist_id, profiles:artist_id ( full_name, artist_code ) )')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows: OrderRow[] = (orders || []).map((o: any) => ({
      date: o.created_at.split('T')[0],
      invoiceNumber: o.invoice_number,
      orderSku: o.order_sku,
      artworkTitle: o.artworks?.title || '',
      artistName: o.artworks?.profiles?.full_name || '',
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      printSize: o.print_size,
      originalPrice: o.original_price,
      offerLabel: o.offer_label,
      offerPct: o.offer_pct,
      discountAmount: o.discount_amount,
      buyerPaid: o.total_paid,
      handlingFee: o.handling_fee,
      fpCommission: o.fp_commission,
      artistEarnings: o.artist_earnings,
      payoutStatus: o.payout_status,
      deliveryMethod: o.delivery_method,
      status: o.status,
    }))

    const csvContent = type === 'admin' ? generateAdminCSV(rows) : generateArtistCSV(rows, 'Artist')
    const filename = type === 'admin'
      ? `fineprint_sales_${artist}_${from}_to_${to}.csv`
      : `fineprint_my_sales_${from}_to_${to}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('CSV export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
