'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PRINTING_FEES, formatMVR } from '@/lib/pricing'

export function InvoiceModal({ order, profile, onClose }: { order: any; profile: any; onClose: () => void }) {
  const [myItems, setMyItems] = useState<any[]>([])
  const supabase = createClient()

  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup — FinePrint Studio, Malé'
    : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`
  const isSwipe = order.payment_method === 'swipe'
  const displayName = profile?.display_name || profile?.full_name || ''

  useEffect(() => {
    async function loadItems() {
      // Fetch only this artist's items from this order
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, artworks(title, sku)')
        .eq('order_id', order.id)
        .eq('artist_id', profile.id)

      if (orderItems && orderItems.length > 0) {
        setMyItems(orderItems)
      } else {
        // Legacy fallback — single item order
        setMyItems([{
          print_size:      order.print_size,
          original_price:  order.original_price,
          offer_pct:       order.offer_pct,
          offer_label:     order.offer_label,
          discount_amount: order.discount_amount,
          print_price:     order.print_price,
          printing_fee:    order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4'],
          artist_earnings: order.artist_earnings,
          artworks:        order.artworks,
        }])
      }
    }
    loadItems()
  }, [order.id, profile.id])

  const myEarnings = myItems.reduce((s, i) => s + (i.artist_earnings || 0), 0)

  function buildPrintHTML() {
    const lineItems = myItems.map(item => {
      const hasOffer    = item.offer_pct && item.offer_pct > 0
      const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
      const itemSku     = item.artworks?.sku ? item.artworks.sku + '-' + item.print_size : order.order_sku
      return `
        <tr style="border-bottom:1px solid #f4f4f0">
          <td style="padding:12px 0;vertical-align:top">
            <div style="font-size:13px;font-weight:500;color:#222">${item.artworks?.title || ''}</div>
            <div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">${itemSku}</div>
            ${hasOffer ? `<div style="font-size:11px;color:#c05030;margin-top:2px">${item.offer_label} ${item.offer_pct}% off</div>` : ''}
          </td>
          <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${displayName}</td>
          <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${item.print_size}</td>
          <td style="padding:12px 0;text-align:right;vertical-align:top">
            ${hasOffer ? `<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ${item.original_price}</div>` : ''}
            <div style="font-size:13px;font-weight:500;color:#222">MVR ${item.print_price}</div>
          </td>
        </tr>`
    }).join('')

    const subtotalRows = myItems.map(item => {
      const hasOffer    = item.offer_pct && item.offer_pct > 0
      const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
      return `
        ${myItems.length > 1 ? `<tr><td colspan="2" style="color:#aaa;padding:6px 0 2px;font-size:11px;text-transform:uppercase">${item.artworks?.title || ''}</td></tr>` : ''}
        ${hasOffer
          ? `<tr><td style="color:#888;padding:3px 0;font-size:12px">Artwork price</td><td style="text-align:right;font-size:12px;color:#aaa;text-decoration:line-through">MVR ${item.original_price}</td></tr>
             <tr><td style="color:#c05030;padding:3px 0;font-size:12px">${item.offer_label} (${item.offer_pct}% off)</td><td style="text-align:right;font-size:12px;color:#c05030">- MVR ${item.discount_amount}</td></tr>`
          : `<tr><td style="color:#888;padding:3px 0;font-size:12px">Artwork price</td><td style="text-align:right;font-size:12px">MVR ${item.original_price}</td></tr>`
        }
        <tr><td style="color:#888;padding:3px 0;font-size:12px">${item.print_size} giclee printing</td><td style="text-align:right;font-size:12px">MVR ${printingFee}</td></tr>`
    }).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.invoice_number}</title>
    <style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6}
    @media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>
    <body><div class="wrap">
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
    <div style="padding:24px 32px">
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
    <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:8px">Your items in this order</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr style="border-bottom:1px solid #e8e8e4">
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artwork</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artist</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Size</th>
      <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:right;font-weight:500">Amount</th>
    </tr>
    ${lineItems}
    </table>
    <table style="width:220px;margin-left:auto;border-collapse:collapse">
    ${subtotalRows}
    <tr style="border-top:1px solid #e8e8e4">
      <td style="padding:8px 0 4px;font-size:13px;font-weight:600;color:#111">Your earnings</td>
      <td style="text-align:right;padding:8px 0 4px;font-size:13px;font-weight:600;color:#1D9E75">MVR ${myEarnings}</td>
    </tr></table>
    <div style="border-top:1px solid #f0f0ec;margin:16px 0"></div>
    <p style="font-size:11px;color:#aaa;line-height:1.6;margin:0">
      ${isSwipe ? 'Paid via Swipe.' : 'Paid via BML bank transfer.'}
      ${order.delivery_method === 'pickup' ? ' Print ready for pickup at FinePrint Studio, Malé.' : ' Print will be dispatched to buyer.'}
    </p>
    </div>
    <div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">
    <span style="font-size:11px;color:#aaa">FinePrint Studio · Malé, Maldives</span>
    <span style="font-size:11px;color:#1D9E75">fineprintmv.com</span>
    </div></div></body></html>`
  }

  function printInvoice() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(buildPrintHTML())
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printInvoice} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 28, maxHeight: '80vh', overflowY: 'auto' }}>

          {/* Invoice header */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Fine<span style={{ color: '#9FE1CB' }}>Print</span> Studio</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>fineprintmv.com · hello@fineprintmv.com</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{date}</div>
              <div style={{ marginTop: 6, display: 'inline-block', background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>Approved</div>
            </div>
          </div>

          {/* Addresses */}
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

          {/* Your items */}
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>
            Your items in this order
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
              {myItems.map((item, i) => {
                const hasOffer = item.offer_pct && item.offer_pct > 0
                const itemSku  = item.artworks?.sku ? item.artworks.sku + '-' + item.print_size : order.order_sku
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f4f0' }}>
                    <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                      <p style={{ fontSize: 13, color: '#222', fontWeight: 500, margin: 0 }}>{item.artworks?.title}</p>
                      <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{itemSku}</p>
                      {hasOffer && <p style={{ fontSize: 11, color: '#c05030', marginTop: 2 }}>{item.offer_label} {item.offer_pct}% off</p>}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{displayName}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{item.print_size}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'top' }}>
                      {hasOffer && <p style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', margin: 0 }}>MVR {item.original_price}</p>}
                      <p style={{ fontSize: 13, color: '#222', fontWeight: 500, margin: 0 }}>MVR {item.print_price}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Earnings */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <table style={{ width: 240, borderCollapse: 'collapse' }}>
              <tbody>
                {myItems.map((item, i) => {
                  const hasOffer    = item.offer_pct && item.offer_pct > 0
                  const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
                  return (
                    <tr key={i}>
                      {hasOffer ? (
                        <>
                          <td style={{ color: '#888', padding: '3px 0', fontSize: 12 }}>Original price</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {item.original_price}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ color: '#888', padding: '3px 0', fontSize: 12 }}>Artwork price</td>
                          <td style={{ textAlign: 'right', fontSize: 12 }}>MVR {item.original_price}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
                <tr style={{ borderTop: '1px solid #e8e8e4' }}>
                  <td style={{ padding: '8px 0 4px', fontSize: 14, fontWeight: 600, color: '#111' }}>Your earnings</td>
                  <td style={{ textAlign: 'right', padding: '8px 0 4px', fontSize: 14, fontWeight: 600, color: '#1D9E75' }}>{formatMVR(myEarnings)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid #f0f0ec', marginBottom: 12 }} />
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            {isSwipe ? 'Paid via Swipe.' : 'Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).'}
            {order.delivery_method === 'pickup'
              ? ' Print ready for pickup at FinePrint Studio, Malé.'
              : ' Print will be dispatched to buyer address.'}
          </p>
        </div>
      </div>
    </div>
  )
}

