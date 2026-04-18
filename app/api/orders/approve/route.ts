import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendInvoiceEmail } from '@/lib/invoice'

export async function POST(req: NextRequest) {
  try {
    const { invoiceNumber, action } = await req.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch full order + artwork + buyer details
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        artworks ( title, artist_id, profiles:artist_id ( full_name ) ),
        profiles:buyer_id ( full_name, email )
      `)
      .eq('invoice_number', invoiceNumber)
      .single()

    if (error || !order) throw error || new Error('Order not found')

    // Update order status
    await supabase
      .from('orders')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: action === 'approve' ? new Date().toISOString() : null,
      })
      .eq('invoice_number', invoiceNumber)

    // Send invoice email on approval
    if (action === 'approve') {
      const buyerAddress = order.delivery_method === 'pickup'
        ? 'Pickup — FinePrint Studio, Malé'
        : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

      await sendInvoiceEmail({
        invoiceNumber: order.invoice_number,
        orderSku: order.order_sku,
        date: new Date(order.approved_at).toLocaleDateString('en-MV', {
          day: 'numeric', month: 'long', year: 'numeric'
        }),
        buyerName: order.buyer_name,
        buyerEmail: order.buyer_email,
        buyerPhone: order.buyer_phone || '',
        buyerAddress,
        artworkTitle: order.artworks.title,
        artistName: order.artworks.profiles.full_name,
        printSize: order.print_size,
        originalPrice: order.original_price,
        offerLabel: order.offer_label,
        offerPct: order.offer_pct,
        discountAmount: order.discount_amount,
        printPrice: order.print_price,
        handlingFee: order.handling_fee,
        totalPaid: order.total_paid,
        deliveryMethod: order.delivery_method,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Approve/reject error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
