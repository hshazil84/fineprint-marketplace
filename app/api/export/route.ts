import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateArtistCSV, generateAdminCSV, OrderRow } from '@/lib/csvExport'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from     = searchParams.get('from') || '2024-01-01'
    const to       = searchParams.get('to')   || new Date().toISOString().split('T')[0]
    const artist   = searchParams.get('artist') || 'all'   // admin only
    const type     = searchParams.get('type') || 'artist'  // 'artist' | 'admin'

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        created_at, invoice_number, order_sku, print_size,
        original_price, offer_label, offer_pct, discount_amount,
        total_paid, handling_fee, fp_commission, artist_earnings,
        payout_status, delivery_method, status, buyer_name, buyer_email,
        artworks ( title, artist_id, profiles:artist_id ( full_name ) )
      `)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    // Artists only see their own orders
    if (profile.role === 'artist') {
      query = query.eq('artworks.artist_id', user.id)
    } else if (profile.role === 'admin' && artist !== 'all') {
      // Admin filtering by specific artist code
      query = query.eq('artworks.profiles.artist_code', artist)
    } else if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: orders, error } = await query
    if (error) throw error

    // Map to OrderRow shape
    const rows: OrderRow[] = (orders || []).map((o: any) => ({
      date:            o.created_at.split('T')[0],
      invoiceNumber:   o.invoice_number,
      orderSku:        o.order_sku,
      artworkTitle:    o.artworks?.title || '',
      artistName:      o.artworks?.profiles?.full_name || '',
      buyerName:       o.buyer_name,
      buyerEmail:      o.buyer_email,
      printSize:       o.print_size,
      originalPrice:   o.original_price,
      offerLabel:      o.offer_label,
      offerPct:        o.offer_pct,
      discountAmount:  o.discount_amount,
      buyerPaid:       o.total_paid,
      handlingFee:     o.handling_fee,
      fpCommission:    o.fp_commission,
      artistEarnings:  o.artist_earnings,
      payoutStatus:    o.payout_status,
      deliveryMethod:  o.delivery_method,
      status:          o.status,
    }))

    // Generate CSV
    const csvContent = profile.role === 'admin'
      ? generateAdminCSV(rows)
      : generateArtistCSV(rows, profile.full_name)

    const filename = profile.role === 'admin'
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
