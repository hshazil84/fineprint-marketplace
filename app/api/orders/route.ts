import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { calculatePrices, buildOrderSKU } from '@/lib/pricing'
import { notifyNewOrder } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      artworkId, artworkSku, artworkTitle, artistName,
      buyerId, buyerName, buyerEmail, buyerPhone,
      printSize, deliveryMethod,
      deliveryIsland, deliveryAtoll, deliveryNotes,
      originalPrice, offerLabel, offerPct,
    } = body

    const supabase = createAdminClient()

    // Calculate all prices
    const prices = calculatePrices(originalPrice, offerPct || 0, offerLabel, deliveryMethod)

    // Generate invoice number
    const { data: invData } = await supabase.rpc('generate_invoice_number')
    const invoiceNumber = invData || `INV-${new Date().getFullYear()}-${Date.now()}`

    // Build order SKU
    const orderSku = buildOrderSKU(artworkSku, printSize)

    // Insert order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        invoice_number:   invoiceNumber,
        order_sku:        orderSku,
        artwork_id:       artworkId,
        buyer_id:         buyerId,
        buyer_name:       buyerName,
        buyer_email:      buyerEmail,
        buyer_phone:      buyerPhone,
        original_price:   prices.originalPrice,
        offer_label:      offerLabel || null,
        offer_pct:        offerPct || 0,
        discount_amount:  prices.discountAmount,
        print_price:      prices.printPrice,
        handling_fee:     prices.handlingFee,
        total_paid:       prices.totalPaid,
        fp_commission:    prices.fpCommission,
        artist_earnings:  prices.artistEarnings,
        delivery_method:  deliveryMethod,
        delivery_island:  deliveryIsland || null,
        delivery_atoll:   deliveryAtoll || null,
        delivery_notes:   deliveryNotes || null,
        print_size:       printSize,
        status:           'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Send Telegram notification
    await notifyNewOrder({
      invoiceNumber,
      orderSku,
      artworkTitle,
      artistName,
      buyerName,
      buyerPhone: buyerPhone || 'Not provided',
      deliveryMethod,
      deliveryIsland,
      deliveryAtoll,
      totalPaid: prices.totalPaid,
      offerLabel,
      offerPct,
    })

    return NextResponse.json({ success: true, invoiceNumber, orderSku })
  } catch (err: any) {
    console.error('Order error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
