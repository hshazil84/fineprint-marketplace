export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generateArtistCSV, generateAdminCSV, OrderRow } from '@/lib/csvExport'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from   = searchParams.get('from') || '2024-01-01'
    const to     = searchParams.get('to')   || new Date().toISOString().split('T')[0]
    const artist = searchParams.get('artist') || 'all'
    const type   = searchParams.get('type') || 'artist'

    const supabase = createAdminClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        created_at, invoice_number, order_sku, print_size,
        original_price, offer_label, offer_pct, discount_amount,
        total_paid, handling_fee, fp_commission, artist_earnings,
        payout_status, delivery_method, status, buyer_name, buyer_email,
        artworks ( title, artist_id, profiles:artist_id ( full_name, artist_code ) )
      `)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows: OrderRow[] = (orders || []).map((
