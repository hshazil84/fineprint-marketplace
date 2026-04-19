import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendReadyForPickupEmail, sendOutForDeliveryEmail } from '@/lib/invoice'

export async function POST(req: NextRequest) {
  try {
    const { invoiceNumber, status, sendEmail } = await req.json()

    const supabase = createAdminClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, artworks(title, profiles:artist_id(full_name))')
      .eq('invoice_number', invoiceNumber)
      .single()

    if (error || !order) throw error || new Error('Order not found')

    await supabase
      .from('orders')
      .update({ status })
      .eq('invoice_number', invoiceNumber)

    if (sendEmail) {
      const emailData = {
        buyerName:     order.buyer_name,
        buyerEmail:    order.buyer_email,
        invoiceNumber: order.invoice_number,
        orderSku:      order.order_sku,
        artworkTitle:  order.artworks.title,
        printSize:     order.print_size,
        deliveryMethod: order.delivery_method,
        deliveryIsland: order.delivery_island,
        deliveryAtoll:  order.delivery_atoll,
      }

      if (status === 'ready' && order.delivery_method === 'pickup') {
        await sendReadyForPickupEmail(emailData)
      } else if (status === 'ready' && order.delivery_method === 'delivery') {
        await sendOutForDeliveryEmail(emailData)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Status update error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
