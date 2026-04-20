import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifyNewOrder } from '@/lib/telegram'
import { sendInvoiceEmail } from '@/lib/invoice'

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return 'INV-' + year + '-' + month + day + '-' + rand
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const invoiceNumber = generateInvoiceNumber()
    const orderSku = body.artworkSku + '-' + body.printSize

    const hasOffer = body.offerPct && body.offerPct > 0
    const discountAmount = hasOffer ? Math.round(body.originalPrice * body.offerPct / 100) : 0
    const printPrice = body.originalPrice - discountAmount

    const { data: order, error } = await supabase.from('orders').insert({
      invoice_number:   invoiceNumber,
      order_sku:        orderSku,
      artwork_id:       body.artworkId,
      buyer_id:         body.buyerId || null,
      buyer_name:       body.buyerName,
      buyer_email:      body.buyerEmail,
      buyer_phone:      body.buyerPhone,
      original_price:   body.originalPrice,
      offer_label:      body.offerLabel || null,
      offer_pct:        body.offerPct || null,
      discount_amount:  discountAmount,
      print_price:      printPrice,
      printing_fee:     body.printingFee,
      handling_fee:     body.handlingFee,
      total_paid:       body.totalPaid,
      fp_commission:    body.fpCommission,
      artist_earnings:  body.artistEarnings,
      print_size:       body.printSize,
      delivery_method:  body.deliveryMethod,
      delivery_island:  body.deliveryIsland || null,
      delivery_atoll:   body.deliveryAtoll || null,
      delivery_notes:   body.deliveryNotes || null,
      status:           'pending',
      payment_method:   body.paymentMethod || 'bank_transfer',
    }).select().single()

    if (error) throw error

    const { data: artwork } = await supabase
      .from('artworks')
      .select('profiles:artist_id(full_name, display_name)')
      .eq('id', body.artworkId)
      .single()

    const artistName = (artwork?.profiles as any)?.display_name || (artwork?.profiles as any)?.full_name || body.artistName

    await notifyNewOrder({
      invoiceNumber,
      orderSku,
      artworkTitle:   body.artworkTitle,
      artistName,
      buyerName:      body.buyerName,
      buyerPhone:     body.buyerPhone,
      deliveryMethod: body.deliveryMethod,
      deliveryIsland: body.deliveryIsland,
      deliveryAtoll:  body.deliveryAtoll,
      totalPaid:      body.totalPaid,
      offerLabel:     body.offerLabel,
      offerPct:       body.offerPct,
      paymentMethod:  body.paymentMethod || 'bank_transfer',
    })

    try {
      await upsertCustomer(supabase, {
        name:            body.buyerName,
        email:           body.buyerEmail,
        phone:           body.buyerPhone,
        isGuest:         body.isGuest,
        newsletterOptIn: body.newsletterOptIn,
        totalPaid:       body.totalPaid,
      })
    } catch (customerErr) {
      console.error('Customer upsert failed:', customerErr)
    }

    return NextResponse.json({ success: true, invoiceNumber, orderSku, orderId: order.id })
  } catch (err: any) {
    console.error('Order creation failed:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

async function upsertCustomer(supabase: any, data: {
  name: string
  email: string
  phone: string
  isGuest: boolean
  newsletterOptIn: boolean
  totalPaid: number
}) {
  const { data: existing } = await supabase
    .from('customers')
    .select('id, order_count, total_spent')
    .eq('email', data.email.toLowerCase())
    .single()

  if (existing) {
    await supabase.from('customers').update({
      name:             data.name,
      phone:            data.phone,
      order_count:      (existing.order_count || 0) + 1,
      total_spent:      (existing.total_spent || 0) + data.totalPaid,
      last_order_at:    new Date().toISOString(),
      newsletter_opt_in: data.newsletterOptIn || false,
      updated_at:       new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('customers').insert({
      name:             data.name,
      email:            data.email.toLowerCase(),
      phone:            data.phone,
      is_guest:         data.isGuest,
      newsletter_opt_in: data.newsletterOptIn || false,
      order_count:      1,
      total_spent:      data.totalPaid,
      first_order_at:   new Date().toISOString(),
      last_order_at:    new Date().toISOString(),
    })
  }
}
