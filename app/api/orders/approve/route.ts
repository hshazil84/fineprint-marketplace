import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendInvoiceEmail } from '@/lib/invoice'
import { PRINTING_FEES } from '@/lib/pricing'

// Sheets used per print size
const SHEETS_PER_SIZE: Record<string, string> = {
  'A4':    'stock_qty_a4',
  'A3':    'stock_qty_a3',
  'A2':    'stock_qty_a2',
  '12x16': 'stock_qty_a2', // uses A2 sheets
}

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
        .select('*, artworks(id, title, sku, paper_type, edition_size, editions_sold, profiles:artist_id(full_name, display_name))')
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

        // ── Increment editions_sold ──
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
          if (!artwork.edition_size) continue
          const newSold = (artwork.editions_sold || 0) + count
          await supabase
            .from('artworks')
            .update({ editions_sold: newSold })
            .eq('id', artwork.id)
        }

        // ── Auto stock deduction per size ──
        // Group by paper_type + print_size
        const deductions: Record<string, Record<string, number>> = {}
        // deductions[paperName][sizeField] = sheetsToDeduct

        for (const item of orderItems) {
          const paperName = item.artworks?.paper_type
          const sizeField = SHEETS_PER_SIZE[item.print_size]
          if (!paperName || !sizeField) continue

          if (!deductions[paperName]) deductions[paperName] = {}
          deductions[paperName][sizeField] = (deductions[paperName][sizeField] || 0) + 1
        }

        for (const [paperName, sizeDeductions] of Object.entries(deductions)) {
          const { data: paper } = await supabase
            .from('papers')
            .select('id, paper_id, stock_qty_a4, stock_qty_a3, stock_qty_a2, stock_low_threshold, stock_status, wastage_pct')
            .eq('name', paperName)
            .single()

          if (!paper) continue

          const wastageMultiplier = 1 + (paper.wastage_pct || 10) / 100
          const updates: Record<string, number> = {}
          const movements: any[] = []

          let newA4 = paper.stock_qty_a4
          let newA3 = paper.stock_qty_a3
          let newA2 = paper.stock_qty_a2

          for (const [sizeField, sheets] of Object.entries(sizeDeductions)) {
            const totalDeduction = Math.ceil(sheets * wastageMultiplier)
            const printSize      = sizeField === 'stock_qty_a4' ? 'A4' : sizeField === 'stock_qty_a3' ? 'A3' : 'A2'
            const currentQty     = (paper as any)[sizeField] as number
            const newQty         = Math.max(0, currentQty - totalDeduction)

            updates[sizeField] = newQty

            if (sizeField === 'stock_qty_a4') newA4 = newQty
            if (sizeField === 'stock_qty_a3') newA3 = newQty
            if (sizeField === 'stock_qty_a2') newA2 = newQty

            movements.push({
              paper_id:   paper.paper_id,
              change_qty: -totalDeduction,
              reason:     'order_approved',
              order_id:   order.id,
              print_size: printSize,
              notes:      `Order ${invoiceNumber} — ${sheets} sheet(s) + ${paper.wastage_pct}% wastage buffer`,
            })
          }

          // Derive new stock status from minimum qty across all sizes
          const minQty = Math.min(newA4, newA3, newA2)
          let newStatus = paper.stock_status
          if (minQty === 0) newStatus = 'out_of_stock'
          else if (minQty <= paper.stock_low_threshold) newStatus = 'low_stock'
          else newStatus = 'in_stock'

          await supabase
            .from('papers')
            .update({ ...updates, stock_status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', paper.id)

          if (movements.length > 0) {
            await supabase.from('paper_stock_movements').insert(movements)
          }
        }

      } else {
        // Legacy single-item order fallback
        const { data: artwork } = await supabase
          .from('artworks')
          .select('id, title, sku, paper_type, edition_size, editions_sold, profiles:artist_id(full_name, display_name)')
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

        // Increment editions for legacy order
        if (artwork?.edition_size) {
          await supabase
            .from('artworks')
            .update({ editions_sold: (artwork.editions_sold || 0) + 1 })
            .eq('id', artwork.id)
        }

        // Stock deduction for legacy order
        if (artwork?.paper_type) {
          const sizeField = SHEETS_PER_SIZE[order.print_size]
          const { data: paper } = await supabase
            .from('papers')
            .select('id, paper_id, stock_qty_a4, stock_qty_a3, stock_qty_a2, stock_low_threshold, stock_status, wastage_pct')
            .eq('name', artwork.paper_type)
            .single()

          if (paper && sizeField) {
            const wastageMultiplier = 1 + (paper.wastage_pct || 10) / 100
            const totalDeduction    = Math.ceil(1 * wastageMultiplier)
            const currentQty        = (paper as any)[sizeField] as number
            const newQty            = Math.max(0, currentQty - totalDeduction)

            let newA4 = paper.stock_qty_a4
            let newA3 = paper.stock_qty_a3
            let newA2 = paper.stock_qty_a2
            if (sizeField === 'stock_qty_a4') newA4 = newQty
            if (sizeField === 'stock_qty_a3') newA3 = newQty
            if (sizeField === 'stock_qty_a2') newA2 = newQty

            const minQty = Math.min(newA4, newA3, newA2)
            let newStatus = paper.stock_status
            if (minQty === 0) newStatus = 'out_of_stock'
            else if (minQty <= paper.stock_low_threshold) newStatus = 'low_stock'
            else newStatus = 'in_stock'

            await supabase
              .from('papers')
              .update({ [sizeField]: newQty, stock_status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', paper.id)

            await supabase
              .from('paper_stock_movements')
              .insert({
                paper_id:   paper.paper_id,
                change_qty: -totalDeduction,
                reason:     'order_approved',
                order_id:   order.id,
                print_size: order.print_size,
                notes:      `Order ${invoiceNumber} — 1 sheet + ${paper.wastage_pct}% wastage buffer`,
              })
          }
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
