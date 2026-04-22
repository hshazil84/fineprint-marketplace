'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'

export function InvoiceModal({ order, onClose }: { order: any; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([])
  const supabase = createClient()

  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup — FinePrint Studio, Malé'
    : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`
  const isSwipe = order.payment_method === 'swipe'

  useEffect(() => {
    async function loadItems() {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, artworks(title, sku, price, profiles:artist_id(full_name, display_name))')
        .eq('order_id', order.id)

      if (orderItems && orderItems.length > 0) {
        setItems(orderItems)
      } else if (order.artwork_id) {
        const { data: artwork } = await supabase
          .from('artworks')
          .select('title, sku, price, profiles:artist_id(full_name, display_name)')
          .eq('id', order.artwork_id)
          .single()
        setItems([{
          print_size:      order.print_size,
          original_price:  order.original_price  || artwork?.price,
          offer_pct:       order.offer_pct        || null,
          offer_label:     order.offer_label      || null,
          discount_amount: order.discount_amount  || 0,
          print_price:     order.print_price      || order.total_paid,
          printing_fee:    order.printing_fee     || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4'],
          fp_commission:   order.fp_commission,
          artist_earnings: order.artist_earnings,
          artworks:        artwork,
        }])
      }
    }
    loadItems()
  }, [order.id])

  const totalArtistEarnings = items.reduce((s, i) => s + (i.artist_earnings || 0), 0)
  const totalFpCommission   = items.reduce((s, i) => s + (i.fp_commission   || 0), 0)

  function buildLineItemsHTML() {
    return items.map(item => {
      const hasOffer   = item.offer_pct && item.offer_pct > 0
      const printFee   = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
      const origPrice  = item.original_price || 0
      const printPrice = item.print_price || 0
      const artistName = item.artworks?.profiles?.display_name || item.artworks?.profiles?.full_name || ''
      const itemSku    = item.artworks?.sku ? item.artworks.sku + '-' + item.print_size : order.order_sku
      return `
        <tr style="border-bottom:1px solid #f4f4f0">
          <td style="padding:12px 0;vertical-align:top">
            <div style="font-size:13px;font-weight:500;color:#222">${item.artworks?.title || ''}</div>
            <div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">${itemSku}</div>
            ${hasOffer ? `<div style="font-size:11px;color:#c05030;margin-top:2px">${item.offer_label} −${item.offer_pct}%</div>` : ''}
          </td>
          <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${artistName}</td>
          <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${item.print_size}</td>
          <td style="padding:12px 0;text-align:right;vertical-align:top">
            ${hasOffer ? `<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ${origPrice + printFee}</div>` : ''}
            <div style="font-size:13px;font-weight:500;color:#222">MVR ${printPrice}</div>
          </td>
        </tr>`
    }).join('')
  }

  function buildSubtotalRowsHTML() {
    return items.map(item => {
      const hasOffer    = item.offer_pct && item.offer_pct > 0
      const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
      const origPrice   = item.original_price || 0
      const discAmount  = item.discount_amount || 0
      return `
        ${items.length > 1 ? `<tr><td colspan="2" style="color:#aaa;padding:6px 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em">${item.artworks?.title || ''}</td></tr>` : ''}
        ${hasOffer
          ? `<tr><td style="color:#888;padding:3px 0;font-size:12px">Artwork price</td><td style="text-align:right;font-size:12px;color:#aaa;text-decoration:line-through">MVR ${origPrice}</td></tr>
             <tr><td style="color:#c05030;padding:3px 0;font-size:12px">${item.offer_label} (−${item.offer_pct}%)</td><td style="text-align:right;font-size:12px;color:#c05030">− MVR ${discAmount}</td></tr>`
          : `<tr><td style="color:#888;padding:3px 0;font-size:12px">Artwork price</td><td style="text-align:right;font-size:12px">MVR ${origPrice}</td></tr>`
        }
        <tr><td style="color:#888;padding:3px 0;font-size:12px">${item.print_size} giclée printing</td><td style="text-align:right;font-size:12px">MVR ${printingFee}</td></tr>`
    }).join('')
  }

  // Paid stamp SVG string for print window
  const stampHTML = `
    <div style="position:absolute;top:32px;right:40px;transform:rotate(-18deg);opacity:0.18;pointer-events:none;user-select:none">
      <div style="border:4px solid #1D9E75;border-radius:8px;padding:6px 18px;display:inline-block">
        <div style="font-size:32px;font-weight:900;color:#1D9E75;letter-spacing:0.12em;font-family:-apple-system,sans-serif;line-height:1">PAID</div>
        <div style="font-size:10px;color:#1D9E75;text-align:center;letter-spacing:0.08em;margin-top:2px">${date}</div>
      </div>
    </div>`

  function printInvoice() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.invoice_number}</title>
    <style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}
    .wrap{max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6;position:relative}
    @media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>
    <body><div class="wrap">
    ${stampHTML}
    <div style="background:#1a1a1a;padding:24px 32px;display:flex;justify-content:space-between">
    <div>
      <div style="font-size:18px;font-weight:600;color:#fff">Fine<span style="color:#9FE1CB">Print</span> Studio</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">fineprintmv.com · hello@fineprintmv.com</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase">Invoice</div>
      <div style="font-size:14px;font-weight:600;color:#fff;font-family:monospace">${order.invoice_number}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">${date}</div>
      <div style="margin-top:6px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">Approved</div>
    </div></div>
    <div style="padding:24px 32px;position:relative">
    <table style="width:100%;margin-bottom:20px"><tr>
    <td style="width:50%;vertical-align:top;padding-right:12px">
      <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Billed to</div>
      <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">${order.buyer_name}</div>
      <div style="font-size:12px;color:#555;line-height:1.7">${order.buyer_email}<br>${order.buyer_phone}<br>${buyerAddress}</div>
    </td>
    <td style="width:50%;vertical-align:top">
      <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Fulfilled by</div>
      <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">FinePrint Studio</div>
      <div style="font-size:12px;color:#555;line-height:1.7">hello@fineprintmv.com<br>fineprintmv.com<br>Malé, Maldives</div>
    </td></tr></table>
    <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:8px">Order details · ${items.length} item${items.length !== 1 ? 's' : ''}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr style="border-bottom:1px solid #e8e8e4">
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artwork</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artist</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Size</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:right;font-weight:500">Amount</th>
    </tr>
    ${buildLineItemsHTML()}
    </table>
    <table style="width:240px;margin-left:auto;border-collapse:collapse">
    ${buildSubtotalRowsHTML()}
    ${order.delivery_method === 'delivery'
      ? `<tr><td style="color:#888;padding:3px 0;font-size:13px">Handling & delivery</td><td style="text-align:right;font-size:13px">MVR ${order.handling_fee}</td></tr>`
      : `<tr><td style="color:#1D9E75;padding:3px 0;font-size:13px">Pickup</td><td style="text-align:right;font-size:13px;color:#1D9E75">Free</td></tr>`}
    <tr style="border-top:1px solid #e8e8e4">
      <td style="padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">Total paid</td>
      <td style="text-align:right;padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">MVR ${order.total_paid}</td>
    </tr></table>
    <div style="border-top:1px solid #f0f0ec;margin:16px 0"></div>
    <p style="font-size:11px;color:#aaa;line-height:1.6;margin:0">
      ${isSwipe ? 'Paid via Swipe to hasan@swipe.' : 'Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).'}
      ${order.delivery_method === 'pickup' ? ' Print(s) ready for pickup at FinePrint Studio, Malé.' : ' Print(s) will be dispatched to buyer address.'}
    </p>
    </div>
    <div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">
    <span style="font-size:11px;color:#aaa">FinePrint Studio · Malé, Maldives</span>
    <span style="font-size:11px;color:#1D9E75">fineprintmv.com</span>
    </div></div></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a', flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printInvoice} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              🖨 Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: 28 }}>

          {/* Invoice header block — with PAID stamp */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Fine<span style={{ color: '#9FE1CB' }}>Print</span> Studio</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>fineprintmv.com · hello@fineprintmv.com</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Malé, Maldives</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{date}</div>
              <div style={{ marginTop: 6, display: 'inline-block', background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>Approved</div>
            </div>

            {/* PAID stamp — overlaid on header */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-18deg)',
              opacity: 0.22, pointerEvents: 'none', userSelect: 'none',
            }}>
              <div style={{
                border: '3px solid #9FE1CB',
                borderRadius: 8,
                padding: '4px 16px',
                display: 'inline-block',
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#9FE1CB', letterSpacing: '0.14em', lineHeight: 1 }}>PAID</div>
                <div style={{ fontSize: 9, color: '#9FE1CB', textAlign: 'center', letterSpacing: '0.06em', marginTop: 2 }}>{date}</div>
              </div>
            </div>
          </div>

          {/* Billed to / Fulfilled by */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 6 }}>Billed to</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>{order.buyer_name}</p>
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>{order.buyer_email}<br />{order.buyer_phone}<br />{buyerAddress}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 6 }}>Fulfilled by</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>FinePrint Studio</p>
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>hello@fineprintmv.com<br />fineprintmv.com<br />Malé, Maldives</p>
            </div>
          </div>

          {/* Line items */}
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>
            Order details · {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e8e4' }}>
                {['Artwork', 'Artist', 'Size', 'Amount'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', padding: '6px 0', textAlign: i === 3 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const hasOffer   = item.offer_pct && item.offer_pct > 0
                const printFee   = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
                const origPrice  = item.original_price || 0
                const printPrice = item.print_price || 0
                const artistName = item.artworks?.profiles?.display_name || item.artworks?.profiles?.full_name || ''
                const itemSku    = item.artworks?.sku ? item.artworks.sku + '-' + item.print_size : order.order_sku
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f4f0' }}>
                    <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                      <p style={{ fontSize: 13, color: '#222', fontWeight: 500, margin: 0 }}>{item.artworks?.title}</p>
                      <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{itemSku}</p>
                      {hasOffer && <p style={{ fontSize: 11, color: '#c05030', marginTop: 2 }}>{item.offer_label} −{item.offer_pct}%</p>}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{artistName}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{item.print_size}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'top' }}>
                      {hasOffer && <p style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', margin: 0 }}>MVR {origPrice + printFee}</p>}
                      <p style={{ fontSize: 13, color: '#222', fontWeight: 500, margin: 0 }}>MVR {printPrice}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <table style={{ width: 260, borderCollapse: 'collapse' }}>
              <tbody>
                {items.map((item, i) => {
                  const hasOffer    = item.offer_pct && item.offer_pct > 0
                  const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
                  const origPrice   = item.original_price || 0
                  const discAmount  = item.discount_amount || 0
                  return (
                    <React.Fragment key={i}>
                      {items.length > 1 && (
                        <tr>
                          <td colSpan={2} style={{ color: '#aaa', padding: '6px 0 2px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {item.artworks?.title}
                          </td>
                        </tr>
                      )}
                      {hasOffer ? (
                        <>
                          <tr>
                            <td style={{ color: '#888', padding: '3px 0', fontSize: 12 }}>Artwork price</td>
                            <td style={{ textAlign: 'right', fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {origPrice}</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#c05030', padding: '3px 0', fontSize: 12 }}>{item.offer_label} (−{item.offer_pct}%)</td>
                            <td style={{ textAlign: 'right', fontSize: 12, color: '#c05030' }}>− MVR {discAmount}</td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td style={{ color: '#888', padding: '3px 0', fontSize: 12 }}>Artwork price</td>
                          <td style={{ textAlign: 'right', fontSize: 12 }}>MVR {origPrice}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ color: '#888', padding: '3px 0', fontSize: 12 }}>{item.print_size} giclée printing</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>MVR {printingFee}</td>
                      </tr>
                    </React.Fragment>
                  )
                })}
                {order.delivery_method === 'delivery' ? (
                  <tr>
                    <td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Handling & delivery</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.handling_fee}</td>
                  </tr>
                ) : (
                  <tr>
                    <td style={{ color: '#1D9E75', padding: '3px 0', fontSize: 13 }}>Pickup</td>
                    <td style={{ textAlign: 'right', fontSize: 13, color: '#1D9E75' }}>Free</td>
                  </tr>
                )}
                <tr style={{ borderTop: '1px solid #e8e8e4' }}>
                  <td style={{ padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>Total paid</td>
                  <td style={{ textAlign: 'right', padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>MVR {order.total_paid}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid #f0f0ec', marginBottom: 12 }} />

          {/* Admin note */}
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
              <strong>Admin note:</strong> Total artist earnings = {formatMVR(totalArtistEarnings)} · Platform commission = {formatMVR(totalFpCommission)} · Payout status = {order.payout_status || 'unpaid'}
              {items.length > 1 && (
                <span> · {items.length} artists: {items.map(i => i.artworks?.profiles?.display_name || i.artworks?.profiles?.full_name).join(', ')}</span>
              )}
            </p>
          </div>

          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            {isSwipe ? 'Paid via Swipe to hasan@swipe.' : 'Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).'}
            {order.delivery_method === 'pickup' ? ' Print(s) ready for pickup at FinePrint Studio, Malé.' : ' Print(s) will be dispatched to buyer address.'}
          </p>
        </div>
      </div>
    </div>
  )
}
