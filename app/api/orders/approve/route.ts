import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendInvoiceEmail } from '@/lib/invoice'
import { PRINTING_FEES } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const { invoiceNumber, action } = await req.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .single()
    if (error || !order) throw error || new Error('Order not found')

    const approvedAt = new Date().toISOString()

    await supabase
      .from('orders')
      .update({
        status:      action === 'approve' ? 'approved' : 'rejected',
        approved_at: action === 'approve' ? approvedAt : null,
      })
      .eq('invoice_number', invoiceNumber)

    if (action === 'approve') {
      const buyerAddress = order.delivery_method === 'pickup'
        ? 'Pickup — FinePrint Studio, Malé'
        : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

      const date = new Date(approvedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })

      // Fetch order_items with artwork + artist details
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, artworks(title, sku, profiles:artist_id(full_name, display_name))')
        .eq('order_id', order.id)

      let invoiceItems: any[]

      if (orderItems && orderItems.length > 0) {
        // New multi-item order
        invoiceItems = orderItems.map(item => ({
          artworkTitle:  item.artworks?.title || '',
          artistName:    item.artworks?.profiles?.display_name || item.artworks?.profiles?.full_name || '',
          printSize:     item.print_size,
          orderSku:      (item.artworks?.sku || '') + '-' + item.print_size,
          originalPrice: item.original_price,
          printingFee:   item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4'],
          offerLabel:    item.offer_label,
          offerPct:      item.offer_pct,
          discountAmount: item.discount_amount,
          printPrice:    item.print_price,
        }))
      } else {
        // Legacy single-item order — fallback
        const { data: artwork } = await supabase
          .from('artworks')
          .select('title, sku, profiles:artist_id(full_name, display_name)')
          .eq('id', order.artwork_id)
          .single()

        const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']
        invoiceItems = [{
          artworkTitle:  artwork?.title || '',
          artistName:    (artwork?.profiles as any)?.display_name || (artwork?.profiles as any)?.full_name || '',
          printSize:     order.print_size,
          orderSku:      order.order_sku,
          originalPrice: order.original_price,
          printingFee,
          offerLabel:    order.offer_label,
          offerPct:      order.offer_pct,
          discountAmount: order.discount_amount,
          printPrice:    order.print_price,
        }]
      }

      await sendInvoiceEmail({
        invoiceNumber:  order.invoice_number,
        date,
        buyerName:      order.buyer_name,
        buyerEmail:     order.buyer_email,
        buyerPhone:     order.buyer_phone || '',
        buyerAddress,
        items:          invoiceItems,
        handlingFee:    order.handling_fee || 0,
        totalPaid:      order.total_paid,
        deliveryMethod: order.delivery_method,
        paymentMethod:  order.payment_method || 'bank_transfer',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Approve/reject error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
