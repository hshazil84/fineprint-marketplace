'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Link from 'next/link'

const TABS = ['orders', 'artists', 'listings', 'offers', 'export']
const ORDER_STATUSES = ['pending', 'approved', 'printing', 'ready', 'completed', 'rejected']

// ─── Order Row ────────────────────────────────────────────────────────────────
function OrderRow({ order, onAction, onStatusChange, onViewInvoice, onViewSlip }: any) {
  const [updating, setUpdating] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)

  async function updateStatus(newStatus: string) {
    if (newStatus === order.status) return
    setUpdating(true)
    const shouldSendEmail = sendEmail && newStatus === 'ready'
    const res = await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber: order.invoice_number, status: newStatus, sendEmail: shouldSendEmail }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(shouldSendEmail ? 'Status updated — buyer notified!' : 'Status updated')
      onStatusChange()
    } else {
      toast.error(data.error)
    }
    setUpdating(false)
  }

  return (
    <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{order.invoice_number}</p>
            <span className="sku-tag">{order.order_sku}</span>
            <span className={`badge badge-${order.status}`}>{order.status}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{order.artworks?.title} by {order.artworks?.profiles?.full_name}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {order.buyer_name} · {new Date(order.created_at).toLocaleDateString()} · {formatMVR(order.total_paid)}
            {' · '}{order.delivery_method === 'pickup' ? '🏪 Pickup' : `📦 Deliver → ${order.delivery_island}`}
          </p>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Status dropdown */}
        <select
          className="form-input"
          style={{ fontSize: 12, padding: '5px 10px', maxWidth: 150, height: 'auto', cursor: 'pointer' }}
          value={order.status}
          onChange={e => updateStatus(e.target.value)}
          disabled={updating}
        >
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Email notify toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ cursor: 'pointer' }} />
          Notify buyer
        </label>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {order.slip_url && (
            <button
              className="btn btn-sm"
              style={{ fontSize: 11, padding: '3px 10px', background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', border: 'none' }}
              onClick={onViewSlip}
            >
              📎 Slip
            </button>
          )}
          {order.status !== 'pending' && order.status !== 'rejected' && (
            <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onViewInvoice}>
              📄 Invoice
            </button>
          )}
          {order.status === 'pending' && !order.slip_url && (
            <>
              <button className="btn btn-sm btn-success" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'approve')}>Approve</button>
              <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'reject')}>Reject</button>
            </>
          )}
        </div>
      </div>

      {/* Context hint */}
      {order.status === 'ready' && order.delivery_method === 'pickup' && (
        <p style={{ fontSize: 11, color: 'var(--color-teal-dark)', marginTop: 8, background: 'var(--color-teal-light)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
          📞 Pickup email tells buyer to call 9998124 to arrange collection
        </p>
      )}
      {order.status === 'ready' && order.delivery_method === 'delivery' && (
        <p style={{ fontSize: 11, color: 'var(--color-teal-dark)', marginTop: 8, background: 'var(--color-teal-light)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
          📦 Delivery email tells buyer to expect a call from 9998124
        </p>
      )}
    </div>
  )
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────
function InvoiceModal({ order, onClose }: { order: any, onClose: () => void }) {
  const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']
  const hasOffer = order.offer_pct && order.offer_pct > 0
  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup — FinePrint Studio, Malé'
    : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

  function printInvoice() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(getInvoiceHTML({ order, printingFee, hasOffer, date, buyerAddress }))
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a', flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printInvoice} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>✕ Close</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: 28 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          </div>
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
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>Order details</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e8e4' }}>
                {['Artwork', 'Artist', 'Size', 'Amount'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', padding: '6px 0', textAlign: i === 3 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f4f4f0' }}>
                <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                  <p style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{order.artworks?.title}</p>
                  <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{order.order_sku}</p>
                  {hasOffer && <p style={{ fontSize: 11, color: '#c05030', marginTop: 2 }}>{order.offer_label} −{order.offer_pct}%</p>}
                </td>
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.artworks?.profiles?.full_name}</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.print_size}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'top' }}>
                  {hasOffer && <p style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {order.original_price}</p>}
                  <p style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>MVR {order.print_price}</p>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <table style={{ width: 240, borderCollapse: 'collapse' }}>
              {hasOffer ? (
                <>
                  <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Original price</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.original_price}</td></tr>
                  <tr><td style={{ color: '#c05030', padding: '3px 0', fontSize: 13 }}>{order.offer_label} (−{order.offer_pct}%)</td><td style={{ textAlign: 'right', fontSize: 13, color: '#c05030' }}>− MVR {order.discount_amount}</td></tr>
                </>
              ) : (
                <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Artwork price</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.original_price}</td></tr>
              )}
              <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>{order.print_size} giclée printing</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {printingFee}</td></tr>
              {order.delivery_method === 'delivery' ? (
                <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Handling & delivery</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.handling_fee}</td></tr>
              ) : (
                <tr><td style={{ color: '#1D9E75', padding: '3px 0', fontSize: 13 }}>Pickup</td><td style={{ textAlign: 'right', fontSize: 13, color: '#1D9E75' }}>Free</td></tr>
              )}
              <tr style={{ borderTop: '1px solid #e8e8e4' }}>
                <td style={{ padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>Total paid</td>
                <td style={{ textAlign: 'right', padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>MVR {order.total_paid}</td>
              </tr>
            </table>
          </div>
          <div style={{ borderTop: '1px solid #f0f0ec', marginBottom: 12 }} />
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
              <strong>Admin note:</strong> Artist earnings = {formatMVR(order.artist_earnings)} · Platform commission = {formatMVR(order.fp_commission)} · Payout status = {order.payout_status || 'unpaid'}
            </p>
          </div>
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).
            {order.delivery_method === 'pickup' ? ' Print ready for pickup at FinePrint Studio, Malé.' : ' Print will be dispatched to buyer address.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function getInvoiceHTML({ order, printingFee, hasOffer, date, buyerAddress }: any) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.invoice_number}</title>
  <style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6}
  @media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>
  <body><div class="wrap">
  <div style="background:#1a1a1a;padding:24px 32px;display:flex;justify-content:space-between">
  <div><div style="font-size:18px;font-weight:600;color:#fff">Fine<span style="color:#9FE1CB">Print</span> Studio</div>
  <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">fineprintmv.com · hello@fineprintmv.com</div></div>
  <div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase">Invoice</div>
  <div style="font-size:14px;font-weight:600;color:#fff;font-family:monospace">${order.invoice_number}</div>
  <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">${date}</div>
  <div style="margin-top:6px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">Approved</div></div></div>
  <div style="padding:24px 32px">
  <table style="width:100%;margin-bottom:20px"><tr>
  <td style="width:50%;vertical-align:top;padding-right:12px">
  <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Billed to</div>
  <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">${order.buyer_name}</div>
  <div style="font-size:12px;color:#555;line-height:1.7">${order.buyer_email}<br>${order.buyer_phone}<br>${buyerAddress}</div></td>
  <td style="width:50%;vertical-align:top">
  <div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Fulfilled by</div>
  <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">FinePrint Studio</div>
  <div style="font-size:12px;color:#555;line-height:1.7">hello@fineprintmv.com<br>fineprintmv.com<br>Malé, Maldives</div></td></tr></table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr style="border-bottom:1px solid #e8e8e4">
  <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artwork</th>
  <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artist</th>
  <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Size</th>
  <th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:right;font-weight:500">Amount</th></tr>
  <tr style="border-bottom:1px solid #f4f4f0">
  <td style="padding:12px 0;vertical-align:top"><div style="font-size:13px;font-weight:500;color:#222">${order.artworks?.title}</div>
  <div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">${order.order_sku}</div>
  ${hasOffer ? `<div style="font-size:11px;color:#c05030;margin-top:2px">${order.offer_label} −${order.offer_pct}%</div>` : ''}</td>
  <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${order.artworks?.profiles?.full_name || ''}</td>
  <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${order.print_size}</td>
  <td style="padding:12px 0;text-align:right;vertical-align:top">
  ${hasOffer ? `<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ${order.original_price}</div>` : ''}
  <div style="font-size:13px;font-weight:500;color:#222">MVR ${order.print_price}</div></td></tr></table>
  <table style="width:220px;margin-left:auto;border-collapse:collapse">
  ${hasOffer ? `<tr><td style="color:#888;padding:3px 0;font-size:13px">Original price</td><td style="text-align:right;font-size:13px">MVR ${order.original_price}</td></tr>
  <tr><td style="color:#c05030;padding:3px 0;font-size:13px">${order.offer_label} (−${order.offer_pct}%)</td><td style="text-align:right;font-size:13px;color:#c05030">− MVR ${order.discount_amount}</td></tr>` :
  `<tr><td style="color:#888;padding:3px 0;font-size:13px">Artwork price</td><td style="text-align:right;font-size:13px">MVR ${order.original_price}</td></tr>`}
  <tr><td style="color:#888;padding:3px 0;font-size:13px">${order.print_size} giclée printing</td><td style="text-align:right;font-size:13px">MVR ${printingFee}</td></tr>
  ${order.delivery_method === 'delivery' ?
    `<tr><td style="color:#888;padding:3px 0;font-size:13px">Handling & delivery</td><td style="text-align:right;font-size:13px">MVR ${order.handling_fee}</td></tr>` :
    `<tr><td style="color:#1D9E75;padding:3px 0;font-size:13px">Pickup</td><td style="text-align:right;font-size:13px;color:#1D9E75">Free</td></tr>`}
  <tr style="border-top:1px solid #e8e8e4">
  <td style="padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">Total paid</td>
  <td style="text-align:right;padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">MVR ${order.total_paid}</td></tr></table>
  <div style="border-top:1px solid #f0f0ec;margin:16px 0"></div>
  <p style="font-size:11px;color:#aaa;line-height:1.6;margin:0">Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).
  ${order.delivery_method === 'pickup' ? 'Your print will be ready for pickup at FinePrint Studio, Malé.' : 'Your print will be dispatched to your address.'}</p>
  </div><div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">
  <span style="font-size:11px;color:#aaa">FinePrint Studio · Malé, Maldives</span>
  <span style="font-size:11px;color:#1D9E75">fineprintmv.com</span></div></div></body></html>`
}

// ─── Slip Modal ───────────────────────────────────────────────────────────────
function SlipModal({ order, onClose, onAction }: { order: any, onClose: () => void, onAction: (invoiceNumber: string, action: 'approve' | 'reject') => void }) {
  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      if (order.slip_url) {
        const { data } = await supabase.storage.from('order-slips').createSignedUrl(order.slip_url, 120)
        if (data?.signedUrl) setSlipUrl(data.signedUrl)
      }
      setLoading(false)
    }
    load()
  }, [order])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{order.invoice_number}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{order.artworks?.title} · {order.buyer_name} · {formatMVR(order.total_paid)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-hint)', fontSize: 13 }}>Loading slip...</div>
          ) : slipUrl ? (
            <img src={slipUrl} alt="Transfer slip" style={{ width: '100%', maxHeight: 340, objectFit: 'contain', borderRadius: 8, border: '0.5px solid var(--color-border)', background: '#f9f9f9' }} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-hint)', fontSize: 13, background: 'var(--color-background-secondary)', borderRadius: 8 }}>No slip image found</div>
          )}
          <div style={{ marginTop: 16, background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px' }}>
            {[
              ['Artwork', `${order.artworks?.title} — ${order.print_size}`],
              ['Artist', order.artworks?.profiles?.full_name],
              ['Buyer', `${order.buyer_name} · ${order.buyer_phone || ''}`],
              ['Delivery', order.delivery_method === 'pickup' ? 'Pickup — Malé studio' : `${order.delivery_island}, ${order.delivery_atoll}`],
              ['Amount to verify', formatMVR(order.total_paid)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                <span style={{ fontWeight: k === 'Amount to verify' ? 500 : 400 }}>{v}</span>
              </div>
            ))}
          </div>
          {order.status === 'pending' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-danger btn-full" onClick={() => { onAction(order.invoice_number, 'reject'); onClose() }}>✕ Reject order</button>
              <button className="btn btn-success btn-full" onClick={() => { onAction(order.invoice_number, 'approve'); onClose() }}>✓ Approve & send invoice</button>
            </div>
          )}
          {order.status !== 'pending' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 16 }}>This order has already been <strong>{order.status}</strong>.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Payout Modal ─────────────────────────────────────────────────────────────
function PayoutModal({ payout, onClose, onPaid }: { payout: any, onClose: () => void, onPaid: () => void }) {
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  function handleSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setSlipPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function markAsPaid() {
    if (!slipFile) { toast.error('Please upload payment slip first'); return }
    setSubmitting(true)
    try {
      const slipPath = `payout-${payout.id}.${slipFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('order-slips').upload(slipPath, slipFile, { contentType: slipFile.type })
      if (uploadError) throw uploadError
      const paidAt = new Date().toISOString()
      const { error } = await supabase.from('payouts').update({ status: 'paid', slip_url: slipPath, paid_at: paidAt }).eq('id', payout.id)
      if (error) throw error
      await supabase.from('orders').update({ payout_status: 'paid' })
        .eq('artist_id', payout.artist_id).eq('payout_status', 'unpaid').eq('status', 'approved')
      await fetch('/api/notify/payout-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistName: payout.profiles?.full_name,
          artistEmail: payout.profiles?.email,
          amount: payout.amount,
          bankName: payout.bank_name,
          accountNumber: payout.account_number,
          paidAt: new Date(paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      })
      toast.success('Payout marked as paid — artist notified!')
      onPaid()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Payout — {payout.profiles?.full_name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{formatMVR(payout.amount)} · Requested {new Date(payout.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 10 }}>Bank transfer details</p>
            {[['Bank', payout.bank_name], ['Account name', payout.account_name], ['Account number', payout.account_number], ['Amount', formatMVR(payout.amount)]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: k === 'Amount' ? 500 : 400, fontFamily: k === 'Account number' ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                  {k === 'Account number' && (
                    <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { navigator.clipboard.writeText(v as string); toast.success('Copied!') }}>Copy</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Upload payment confirmation slip</p>
          <div className="upload-zone" onClick={() => document.getElementById('payout-slip-input')?.click()} style={{ marginBottom: 12 }}>
            {slipPreview ? (
              <img src={slipPreview} alt="slip" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <><p style={{ fontSize: 20, marginBottom: 6 }}>📎</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{slipFile ? slipFile.name : 'Tap to upload payment slip'}</p><p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG, PNG or PDF</p></>
            )}
          </div>
          <input type="file" id="payout-slip-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleSlip} />
          <button className="btn btn-success btn-full" onClick={markAsPaid} disabled={submitting || !slipFile}>
            {submitting ? 'Processing...' : `✓ Mark as paid — ${formatMVR(payout.amount)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Remittance Modal ─────────────────────────────────────────────────────────
function RemittanceModal({ payout, onClose }: { payout: any, onClose: () => void }) {
  const paidAt = payout.paid_at
    ? new Date(payout.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  function printRemittance() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Remittance Advice</title>
    <style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}
    .wrap{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6}
    @media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>
    <body><div class="wrap">
    <div style="background:#1a1a1a;padding:24px 32px;display:flex;justify-content:space-between">
    <div><div style="font-size:18px;font-weight:600;color:#fff">Fine<span style="color:#9FE1CB">Print</span> Studio</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">fineprintmv.com</div></div>
    <div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase">Remittance Advice</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">${paidAt}</div>
    <div style="margin-top:6px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">Paid</div></div></div>
    <div style="padding:24px 32px">
    <div style="background:#f0faf6;border:1px solid #9FE1CB;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px">
    <div style="font-size:11px;color:#1D9E75;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Amount paid</div>
    <div style="font-size:30px;font-weight:600;color:#111">MVR ${payout.amount.toLocaleString()}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${paidAt}</div></div>
    <table style="width:100%;border-collapse:collapse">
    ${[['Payee', payout.profiles?.full_name], ['Artist code', `FP-${payout.profiles?.artist_code}`],
      ['Bank', payout.bank_name], ['Account name', payout.account_name],
      ['Account number', payout.account_number], ['Amount', `MVR ${payout.amount.toLocaleString()}`],
      ['Date', paidAt], ['Reference', `PAYOUT-${payout.id.slice(0, 8).toUpperCase()}`]
    ].map(([k, v]) => `<tr style="border-bottom:1px solid #f4f4f0">
    <td style="padding:9px 0;font-size:13px;color:#888">${k}</td>
    <td style="padding:9px 0;font-size:13px;color:#111;text-align:right;font-weight:500;font-family:${k === 'Account number' || k === 'Reference' ? 'monospace' : 'inherit'}">${v}</td></tr>`).join('')}
    </table>
    <p style="font-size:11px;color:#aaa;line-height:1.6;margin-top:16px">This remittance advice confirms payment has been processed by FinePrint Studio. Please retain for your records.</p>
    </div><div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">
    <span style="font-size:11px;color:#aaa">FinePrint Studio · Malé, Maldives</span>
    <span style="font-size:11px;color:#1D9E75">fineprintmv.com</span></div></div></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff' }}>Payout Remittance — {payout.profiles?.full_name}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printRemittance} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: '#f0faf6', border: '1px solid #9FE1CB', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Amount paid</p>
            <p style={{ fontSize: 32, fontWeight: 600, color: '#111', margin: 0 }}>{formatMVR(payout.amount)}</p>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>{paidAt}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            {[['Payee', payout.profiles?.full_name], ['Artist code', `FP-${payout.profiles?.artist_code}`],
              ['Bank', payout.bank_name], ['Account name', payout.account_name],
              ['Account number', payout.account_number], ['Amount', formatMVR(payout.amount)],
              ['Date', paidAt], ['Reference', `PAYOUT-${payout.id.slice(0, 8).toUpperCase()}`]
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #f4f4f0' }}>
                <td style={{ padding: '9px 0', fontSize: 13, color: '#888' }}>{k}</td>
                <td style={{ padding: '9px 0', fontSize: 13, color: '#111', textAlign: 'right', fontWeight: 500, fontFamily: k === 'Account number' || k === 'Reference' ? 'monospace' : 'inherit' }}>{v}</td>
              </tr>
            ))}
          </table>
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>This remittance advice confirms payment has been processed by FinePrint Studio.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'orders')
  const [orders, setOrders] = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [artworks, setArtworks] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null)
  const [remittancePayout, setRemittancePayout] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || prof.role !== 'admin') { router.push('/storefront'); return }
    await Promise.all([fetchOrders(), fetchArtists(), fetchArtworks(), fetchPayouts()])
    setLoading(false)
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*, artworks(title, sku, artist_id, profiles:artist_id(full_name))').order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchArtists() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'artist').order('created_at', { ascending: false })
    setArtists(data || [])
  }

  async function fetchArtworks() {
    const { data } = await supabase.from('artworks').select('*, profiles:artist_id(full_name)').order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchPayouts() {
    const { data } = await supabase.from('payouts').select('*, profiles:artist_id(full_name, artist_code, email)').order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function handleOrderAction(invoiceNumber: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/orders/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber, action }),
    })
    const data = await res.json()
    if (data.success) { toast.success(action === 'approve' ? 'Order approved — invoice sent!' : 'Order rejected'); fetchOrders() }
    else toast.error(data.error)
  }

  async function handleArtworkAction(id: number, status: 'approved' | 'rejected') {
    await supabase.from('artworks').update({ status }).eq('id', id)
    toast.success(`Artwork ${status}`)
    fetchArtworks()
  }

  async function downloadHires(hiresPath: string) {
    const { data } = await supabase.storage.from('artwork-hires').createSignedUrl(hiresPath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not generate download link')
  }

  async function handleExport(from: string, to: string, artist: string) {
    const res = await fetch(`/api/export?type=admin&from=${from}&to=${to}&artist=${artist}`)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, `fineprint_sales_${artist}`))
    toast.success('CSV downloaded!')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const paidPayouts = payouts.filter(p => p.status === 'paid')
  const aprRevenue = orders.filter(o => o.status === 'approved').reduce((s: number, o: any) => s + o.original_price, 0)
  const aprComm = orders.filter(o => o.status === 'approved').reduce((s: number, o: any) => s + o.fp_commission, 0)

  return (
    <div>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <span style={{ fontSize: 12, background: 'var(--color-red-light)', color: '#A32D2D', padding: '3px 10px', borderRadius: 20 }}>Admin</span>
          <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>Log out</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 24 }}>Admin dashboard</h1>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[['Pending orders', pendingOrders.length], ['Total orders', orders.length], ['Gross revenue', formatMVR(aprRevenue)], ['Total commission', formatMVR(aprComm)]].map(([label, value]) => (
            <div key={label as string} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          ))}
        </div>

        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'orders' && pendingOrders.length > 0 && <span style={{ marginLeft: 6, background: 'var(--color-red)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingOrders.length}</span>}
              {t === 'artists' && pendingPayouts.length > 0 && <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingPayouts.length}</span>}
            </button>
          ))}
        </div>

        {/* ORDERS */}
        {tab === 'orders' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {orders.length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders yet.</p>
            ) : orders.map(o => (
              <OrderRow
                key={o.id}
                order={o}
                onAction={handleOrderAction}
                onStatusChange={fetchOrders}
                onViewInvoice={() => setInvoiceOrder(o)}
                onViewSlip={() => setSelectedOrder(o)}
              />
            ))}
          </div>
        )}

        {/* ARTISTS */}
        {tab === 'artists' && (
          <div>
            {pendingPayouts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  💸 Pending payout requests
                  <span style={{ marginLeft: 8, background: 'var(--color-teal)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{pendingPayouts.length}</span>
                </p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {pendingPayouts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{p.profiles?.full_name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>FP-{p.profiles?.artist_code}</span></p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.account_number}</span>
                          <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { navigator.clipboard.writeText(p.account_number); toast.success('Copied!') }}>Copy</button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Requested {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{formatMVR(p.amount)}</p>
                        <button className="btn btn-sm btn-success" onClick={() => setSelectedPayout(p)}>Pay & confirm</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paidPayouts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payout history</p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {paidPayouts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{p.profiles?.full_name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>FP-{p.profiles?.artist_code}</span></p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.paid_at ? `Paid ${new Date(p.paid_at).toLocaleDateString()}` : ''}</p>
                        <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => setRemittancePayout(p)}>📄 View remittance</button>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                        <span className="badge" style={{ background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', marginTop: 4, display: 'inline-block' }}>paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>All artists</p>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {artists.length === 0 ? (
                <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No artists yet.</p>
              ) : artists.map(a => {
                const artistOrders = orders.filter(o => o.artworks?.artist_id === a.id && o.status === 'approved')
                const artistPayoutsArr = payouts.filter(p => p.artist_id === a.id && p.status === 'paid')
                const totalEarned = artistOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
                const totalPaid = artistPayoutsArr.reduce((s: number, p: any) => s + p.amount, 0)
                const artworkCount = artworks.filter(w => w.artist_id === a.id).length
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{a.full_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>FP-{a.artist_code} · {a.email} · {artworkCount} listings · {artistOrders.length} sales</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(totalEarned - totalPaid)} pending</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{formatMVR(totalPaid)} paid out</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* LISTINGS */}
        {tab === 'listings' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {artworks.length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No listings yet.</p>
            ) : artworks.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                {a.preview_url && <img src={a.preview_url} alt={a.title} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="sku-tag">{a.sku}</span>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>by {a.profiles?.full_name} · {formatMVR(a.price)}{a.offer_label ? ` · ${a.offer_label} −${a.offer_pct}%` : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {a.hires_path && <button className="btn btn-sm" onClick={() => downloadHires(a.hires_path)}>⬇ Hi-res</button>}
                  {a.status === 'pending' && (
                    <><button className="btn btn-sm btn-success" onClick={() => handleArtworkAction(a.id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleArtworkAction(a.id, 'rejected')}>Reject</button></>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OFFERS */}
        {tab === 'offers' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Your commission is always based on the original price regardless of artist discounts.</p>
            </div>
            {artworks.filter(a => a.offer_pct).length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No active offers.</p>
            ) : artworks.filter(a => a.offer_pct).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.sku} · {a.offer_pct}% off{a.offer_expires ? ` · Expires ${a.offer_expires}` : ' · No expiry'}</p>
                </div>
                <span className="badge" style={{ background: 'var(--color-red-light)', color: '#A32D2D' }}>Active</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'export' && <AdminExportTab artists={artists} onExport={handleExport} orders={orders} />}
      </div>

      {selectedOrder && <SlipModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onAction={(inv, action) => { handleOrderAction(inv, action); setSelectedOrder(null) }} />}
      {selectedPayout && <PayoutModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onPaid={() => { fetchPayouts(); fetchOrders() }} />}
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {remittancePayout && <RemittanceModal payout={remittancePayout} onClose={() => setRemittancePayout(null)} />}
    </div>
  )
}

function AdminExportTab({ artists, onExport, orders }: any) {
  const today = new Date().toISOString().split('T')[0]
  const yearStart = `${new Date().getFullYear()}-01-01`
  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(today)
  const [artist, setArtist] = useState('all')

  function applyMonth(val: string) {
    if (!val) return
    const [y, m] = val.split('-')
    const last = new Date(parseInt(y), parseInt(m), 0).getDate()
    setFrom(`${val}-01`)
    setTo(`${val}-${String(last).padStart(2, '0')}`)
  }

  const filtered = orders.filter((o: any) => {
    const inRange = o.created_at >= from && o.created_at <= to + 'T23:59:59' && o.status === 'approved'
    if (artist === 'all') return inRange
    return inRange && o.artworks?.profiles?.artist_code === artist
  })

  const gross = filtered.reduce((s: number, o: any) => s + o.original_price, 0)
  const comm = filtered.reduce((s: number, o: any) => s + o.fp_commission, 0)

  const months: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    months.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) })
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Export sales report</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Filter by artist and date range, then download the full CSV.</p>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[['Orders', filtered.length], ['Gross', `MVR ${gross.toLocaleString()}`], ['Commission', `MVR ${comm.toLocaleString()}`]].map(([l, v]) => (
          <div key={l as string} className="stat-card"><p className="stat-label">{l}</p><p className="stat-value" style={{ fontSize: 16 }}>{v}</p></div>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="form-group"><label className="form-label">Artist</label>
          <select className="form-input" value={artist} onChange={e => setArtist(e.target.value)}>
            <option value="all">All artists</option>
            {artists.map((a: any) => <option key={a.id} value={a.artist_code}>FP-{a.artist_code} — {a.full_name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Quick select month</label>
          <select className="form-input" onChange={e => applyMonth(e.target.value)} defaultValue="">
            <option value="">— pick a month —</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="form-group"><label className="form-label">From</label><input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">To</label><input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onExport(from, to, artist)}>Download CSV</button>
    </div>
  )
}

export default function AdminDashboardWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  )
}
