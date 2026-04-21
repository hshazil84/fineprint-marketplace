import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifyNewOrder } from '@/lib/telegram'

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

    const { items, buyerId, buyerName, buyerEmail, buyerPhone,
            deliveryMethod, deliveryIsland, deliveryAtoll, deliveryNotes,
            handlingFee, totalPaid, newsletterOptIn, isGuest, paymentMethod } = body

    const invoiceNumber = generateInvoiceNumber()

    // order_sku = first item sku + count if multiple
    const orderSku = items.length === 1
      ? items[0].artworkSku + '-' + items[0].printSize
      : items[0].artworkSku + '-' + items[0].printSize + '+' + (items.length - 1) + 'more'

    // Totals for the order header
    const totalFpCommission = items.reduce((s: number, i: any) => s + i.fpCommission, 0)
    const totalArtistEarnings = items.reduce((s: number, i: any) => s + i.artistEarnings, 0)
    const firstItem = items[0]

    // Insert order header
    const { data: order, error } = await supabase.from('orders').insert({
      invoice_number:  invoiceNumber,
      order_sku:       orderSku,
      artwork_id:      items.length === 1 ? firstItem.artworkId : null,
      buyer_id:        buyerId || null,
      buyer_name:      buyerName,
      buyer_email:     buyerEmail,
      buyer_phone:     buyerPhone,
      original_price:  firstItem.originalPrice,
      offer_label:     items.length === 1 ? firstItem.offerLabel || null : null,
      offer_pct:       items.length === 1 ? firstItem.offerPct || null : null,
      discount_amount: items.reduce((s: number, i: any) => s + (i.discountAmount || 0), 0),
      print_price:     items.reduce((s: number, i: any) => s + i.printPrice, 0),
      printing_fee:    items.reduce((s: number, i: any) => s + i.printingFee, 0),
      handling_fee:    handlingFee,
      total_paid:      totalPaid,
      fp_commission:   totalFpCommission,
      artist_earnings: totalArtistEarnings,
      print_size:      items.length === 1 ? firstItem.printSize : '',
      delivery_method: deliveryMethod,
      delivery_island: deliveryIsland || null,
      delivery_atoll:  deliveryAtoll || null,
      delivery_notes:  deliveryNotes || null,
      status:          'pending',
      payment_method:  paymentMethod || 'bank_transfer',
    }).select().single()

    if (error) throw error

    // Insert order_items
    const orderItems = items.map((item: any) => ({
      order_id:        order.id,
      artwork_id:      item.artworkId,
      artist_id:       item.artistId,
      print_size:      item.printSize,
      original_price:  item.originalPrice,
      offer_pct:       item.offerPct || 0,
      offer_label:     item.offerLabel || null,
      discount_amount: item.discountAmount || 0,
      print_price:     item.printPrice,
      printing_fee:    item.printingFee,
      fp_commission:   item.fpCommission,
      artist_earnings: item.artistEarnings,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw itemsError

    // Telegram notification
    await notifyNewOrder({
      invoiceNumber,
      orderSku,
      artworkTitle:   items.length === 1 ? firstItem.artworkTitle : items.map((i: any) => i.artworkTitle).join(', '),
      artistName:     items.length === 1 ? firstItem.artistName : items.map((i: any) => i.artistName).join(', '),
      buyerName,
      buyerPhone,
      deliveryMethod,
      deliveryIsland,
      deliveryAtoll,
      totalPaid,
      offerLabel:     items.length === 1 ? firstItem.offerLabel : null,
      offerPct:       items.length === 1 ? firstItem.offerPct : null,
      paymentMethod:  paymentMethod || 'bank_transfer',
      itemCount:      items.length,
    })

    // Customer upsert
    try {
      await upsertCustomer(supabase, {
        name:            buyerName,
        email:           buyerEmail,
        phone:           buyerPhone,
        isGuest,
        newsletterOptIn,
        totalPaid,
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
  name: string; email: string; phone: string
  isGuest: boolean; newsletterOptIn: boolean; totalPaid: number
}) {
  const { data: existing } = await supabase
    .from('customers')
    .select('id, order_count, total_spent')
    .eq('email', data.email.toLowerCase())
    .single()

  if (existing) {
    await supabase.from('customers').update({
      name:              data.name,
      phone:             data.phone,
      order_count:       (existing.order_count || 0) + 1,
      total_spent:       (existing.total_spent || 0) + data.totalPaid,
      last_order_at:     new Date().toISOString(),
      newsletter_opt_in: data.newsletterOptIn || false,
      updated_at:        new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('customers').insert({
      name:              data.name,
      email:             data.email.toLowerCase(),
      phone:             data.phone,
      is_guest:          data.isGuest,
      newsletter_opt_in: data.newsletterOptIn || false,
      order_count:       1,
      total_spent:       data.totalPaid,
      first_order_at:    new Date().toISOString(),
      last_order_at:     new Date().toISOString(),
    })
  }
}
