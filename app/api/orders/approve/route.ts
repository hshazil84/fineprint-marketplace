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
      // Fetch order_items with artwork + artist details
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, artworks(id, title, sku, edition_size, editions_sold, profiles:artist_id(full_name, display_name))')
        .eq('order_id', order.id)

      let invoiceItems: any[]

      if (orderItems && orderItems.length > 0) {
        invoiceItems = orderItems.map(item => ({
          artworkTitle:   item.artworks?.title || '',
          artistName:     item.artworks?.profiles?.display_name || item.artworks?.profiles?.full_name || '',
          printSize:      item.print_size,
          orderSku:       (item.artworks?.sku || '') + '-' + item.print_size,
          originalPrice:  item.original_price,
          printingFee:    item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4'],
          offerLabel:     item.offer_label,
          offerPct:       item.offer_pct > 0 ? item.offer_pct : null,
          discountAmount: item.discount_amount || 0,
          printPrice:     item.print_price,
        }))

        // ── Increment editions_sold for limited edition artworks ──
        // Group by artwork_id to count how many items per artwork in this order
        const artworkCounts: Record<number, { artwork: any; count: number }> = {}
        for (const item of orderItems) {
          const artworkId = item.artworks?.id
          if (!artworkId) continue
          if (!artworkCounts[artworkId]) {
            artworkCounts[artworkId] = { artwork: item.artworks, count: 0 }
          }
          artworkCounts[artworkId].count++
        }

        for (const { artwork, count } of Object.values(artworkCounts)) {
          if (!artwork.edition_size) continue // not limited edition, skip
          const newSold = (artwork.editions_sold || 0) + count
          await supabase
            .from('artworks')
            .update({ editions_sold: newSold })
            .eq('id', artwork.id)
        }

      } else {
        // Legacy single-item order fallback
        const { data: artwork } = await supabase
          .from('artworks')
          .select('id, title, sku, edition_size, editions_sold, profiles:artist_id(full_name, display_name)')
          .eq('id', order.artwork_id)
          .single()

        const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']

        invoiceItems = [{
          artworkTitle:   artwork?.title || '',
          artistName:     (artwork?.profiles as any)?.display_name || (artwork?.profiles as any)?.full_name || '',
          printSize:      order.print_size,
          orderSku:       order.order_sku,
          originalPrice:  order.original_price,
          printingFee,
          offerLabel:     order.offer_label,
          offerPct:       order.offer_pct > 0 ? order.offer_pct : null,
          discountAmount: order.discount_amount || 0,
          printPrice:     order.print_price,
        }]

        // Increment for legacy order too
        if (artwork?.edition_size) {
          await supabase
            .from('artworks')
            .update({ editions_sold: (artwork.editions_sold || 0) + 1 })
            .eq('id', artwork.id)
        }
      }

      const buyerAddress = order.delivery_method === 'pickup'
        ? 'Pickup — FinePrint Studio, Malé'
        : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

      const date = new Date(approvedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })

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
