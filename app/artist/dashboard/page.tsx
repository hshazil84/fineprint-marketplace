'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SIZES = ['A4', 'A3']
const TABS = ['listings', 'offers', 'upload', 'orders', 'payouts', 'export', 'profile']
const PLATFORM_FEE = 5
const CATEGORIES = [
  'Photography', 'Fine Art', 'Abstract', 'Illustration',
  'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
]

// ─── Invoice Modal ───────────────────────────────────────────────────────────
function InvoiceModal({ order, profile, onClose }: { order: any, profile: any, onClose: () => void }) {
  const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']
  const hasOffer = order.offer_pct && order.offer_pct > 0
  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup — FinePrint Studio, Malé'
    : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank')
                if (!printWindow) return
                printWindow.document.write(getInvoiceHTML({ order, printingFee, hasOffer, date, buyerAddress }))
                printWindow.document.close()
                printWindow.focus()
                setTimeout(() => { printWindow.print() }, 500)
              }}
              style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              🖨 Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>✕ Close</button>
          </div>
        </div>

        {/* Invoice body */}
        <div style={{ padding: 28, maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Header */}
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

          {/* Order table */}
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
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.artworks?.profiles?.full_name || profile?.full_name}</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.print_size}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'top' }}>
                  {hasOffer && <p style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {order.original_price}</p>}
                  <p style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>MVR {order.print_price}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
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
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).
            {order.delivery_method === 'pickup' ? ' Your print will be ready for pickup at FinePrint Studio, Malé.' : ' Your print will be dispatched to your address.'}
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

// ─── Remittance Modal ────────────────────────────────────────────────────────
function RemittanceModal({ payout, profile, onClose }: { payout: any, profile: any, onClose: () => void }) {
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
    ${[['Payee', profile?.full_name], ['Artist code', `FP-${profile?.artist_code}`], ['Bank', payout.bank_name],
      ['Account name', payout.account_name], ['Account number', payout.account_number],
      ['Amount', `MVR ${payout.amount.toLocaleString()}`], ['Date', paidAt],
      ['Reference', `PAYOUT-${payout.id.slice(0, 8).toUpperCase()}`]
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff' }}>Payout Remittance</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printRemittance} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>✕ Close</button>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: '#f0faf6', border: '1px solid #9FE1CB', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Amount paid</p>
            <p style={{ fontSize: 32, fontWeight: 600, color: '#111', margin: 0 }}>{formatMVR(payout.amount)}</p>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>{paidAt}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            {[
              ['Payee', profile?.full_name],
              ['Artist code', `FP-${profile?.artist_code}`],
              ['Bank', payout.bank_name],
              ['Account name', payout.account_name],
              ['Account number', payout.account_number],
              ['Amount', formatMVR(payout.amount)],
              ['Date', paidAt],
              ['Reference', `PAYOUT-${payout.id.slice(0, 8).toUpperCase()}`],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #f4f4f0' }}>
                <td style={{ padding: '9px 0', fontSize: 13, color: '#888' }}>{k}</td>
                <td style={{ padding: '9px 0', fontSize: 13, color: '#111', textAlign: 'right', fontWeight: 500, fontFamily: k === 'Account number' || k === 'Reference' ? 'monospace' : 'inherit' }}>{v}</td>
              </tr>
            ))}
          </table>
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            This remittance advice confirms payment has been processed by FinePrint Studio. Please retain for your records.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function ArtistDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState('listings')
  const [profile, setProfile] = useState<any>(null)
  const [artworks, setArtworks] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || prof.role !== 'artist') { router.push('/storefront'); return }
    setProfile(prof)
    await Promise.all([fetchArtworks(user.id), fetchOrders(user.id), fetchPayouts(user.id)])
    setLoading(false)
  }

  async function fetchArtworks(artistId: string) {
    const { data } = await supabase.from('artworks').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchOrders(artistId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks!inner(title, sku, artist_id, profiles:artist_id(full_name))')
      .eq('artworks.artist_id', artistId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchPayouts(artistId: string) {
    const { data } = await supabase.from('payouts').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function handleExport(from: string, to: string) {
    const res = await fetch(`/api/export?type=artist&from=${from}&to=${to}`)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, `fineprint_my_sales`))
    toast.success('CSV downloaded!')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>

  const approvedOrders = orders.filter(o => o.status === 'approved')
  const totalEarnings = approvedOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
  const paidOut = payouts.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
  const pendingEarnings = totalEarnings - paidOut

  return (
    <div>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{profile?.full_name}</span>
          <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>Log out</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 2 }}>Artist dashboard</h1>
            <span className="sku-tag">{profile?.artist_code ? `FP-${profile.artist_code}` : ''}</span>
          </div>
        </div>

        <div className="protection-banner" style={{ marginTop: 16 }}>
          <span>🔒</span>
          <span>Your artwork is protected — buyers only see your watermarked preview. Hi-res files are stored privately for print fulfillment only.</span>
        </div>

        <div className="grid-4" style={{ marginBottom: 24, marginTop: 20 }}>
          {[
            ['Total listings', artworks.length],
            ['Orders received', approvedOrders.length],
            ['Pending payout', formatMVR(pendingEarnings)],
            ['Total earned', formatMVR(totalEarnings)],
          ].map(([label, value]) => (
            <div key={label as string} className="stat-card"
              style={{ cursor: label === 'Pending payout' ? 'pointer' : 'default' }}
              onClick={() => label === 'Pending payout' && setTab('payouts')}>
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
              {label === 'Pending payout' && pendingEarnings > 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>Tap to request →</p>
              )}
            </div>
          ))}
        </div>

        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'payouts' && payouts.filter(p => p.status === 'pending').length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {payouts.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'listings' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {artworks.length === 0 ? (
              <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No listings yet. Upload your first artwork!</p>
            ) : artworks.map(a => {
              const platformFee = Math.round(a.price * PLATFORM_FEE / 100)
              const artistEarns = a.price - platformFee
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                  {a.preview_url && (
                    <img src={a.preview_url} alt={a.title} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="sku-tag">{a.sku}</span>
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                      {a.category && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.category}</span>}
                      {a.offer_label && <span className="offer-tag">{a.offer_label} −{a.offer_pct}%</span>}
                    </div>
                    {a.painting_by && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Painting by {a.painting_by}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(artistEarns)}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>your earnings</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'offers' && <OffersTab artworks={artworks} onRefresh={() => init()} />}
        {tab === 'upload' && <UploadTab profile={profile} nextSeq={artworks.length + 1} onSuccess={() => { setTab('listings'); init() }} />}

        {tab === 'orders' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {orders.length === 0 ? (
              <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No orders yet.</p>
            ) : orders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{o.artworks?.title} — {o.print_size}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {o.invoice_number} · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                  <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{o.order_sku}</span>
                  {o.status === 'approved' && (
                    <button
                      className="btn btn-sm"
                      style={{ marginTop: 6, fontSize: 11, display: 'block' }}
                      onClick={() => setSelectedOrder(o)}
                    >
                      📄 View invoice
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                  <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{formatMVR(o.artist_earnings)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'payouts' && (
          <PayoutsTab
            profile={profile}
            pendingEarnings={pendingEarnings}
            payouts={payouts}
            onRefresh={() => profile && fetchPayouts(profile.id)}
            onViewRemittance={(p: any) => setSelectedPayout(p)}
          />
        )}

        {tab === 'export' && <ExportTab onExport={handleExport} orders={orders} />}
        {tab === 'profile' && <ProfileTab profile={profile} onSave={(updated: any) => setProfile({ ...profile, ...updated })} />}
      </div>

      {selectedOrder && (
        <InvoiceModal order={selectedOrder} profile={profile} onClose={() => setSelectedOrder(null)} />
      )}
      {selectedPayout && (
        <RemittanceModal payout={selectedPayout} profile={profile} onClose={() => setSelectedPayout(null)} />
      )}
    </div>
  )
}

function UploadTab({ profile, nextSeq, onSuccess }: any) {
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'Photography', paintingBy: '' })
  const [hiresFile, setHiresFile] = useState<File | null>(null)
  const [hiresThumb, setHiresThumb] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewThumb, setPreviewThumb] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const nextSku = `FP-${profile?.artist_code}-${String(nextSeq).padStart(3, '0')}`
  const price = parseInt(form.price) || 0
  const platformFeeAmt = Math.round(price * PLATFORM_FEE / 100)
  const artistEarns = price - platformFeeAmt

  function handleFileSelect(file: File | null, setFile: (f: File | null) => void, setThumb: (s: string | null) => void) {
    setFile(file)
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setThumb(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function handleUpload() {
    if (!form.title) { toast.error('Please fill in the title'); return }
    if (!form.price || price < 1) { toast.error('Please set a price'); return }
    if (!hiresFile) { toast.error('Please upload your hi-res print file'); return }
    if (!previewFile) { toast.error('Please upload a preview image for buyers'); return }
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: prof } = await supabase.from('profiles').select('artist_code, full_name').eq('id', user.id).single()
      if (!prof?.artist_code) throw new Error('Artist code not found — please contact support')
      const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', user.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const sku = `FP-${prof.artist_code}-${seq}`

      toast.loading('Uploading hi-res file...', { id: 'upload' })
      const hiresExt = hiresFile.name.split('.').pop()
      const hiresPath = `${sku}-hires.${hiresExt}`
      const { error: hiresError } = await supabase.storage.from('artwork-hires').upload(hiresPath, hiresFile, { contentType: hiresFile.type })
      if (hiresError) throw hiresError

      toast.loading('Uploading preview image...', { id: 'upload' })
      const previewExt = previewFile.name.split('.').pop()
      const previewPath = `${sku}-preview.${previewExt}`
      const { error: previewError } = await supabase.storage.from('artwork-previews').upload(previewPath, previewFile, { contentType: previewFile.type })
      if (previewError) throw previewError

      const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)
      toast.loading('Saving listing...', { id: 'upload' })
      const { error: dbError } = await supabase.from('artworks').insert({
        sku, artist_id: user.id, title: form.title, description: form.description,
        price, hires_path: hiresPath, preview_url: urlData.publicUrl,
        sizes: SIZES, status: 'pending', category: form.category,
        painting_by: form.paintingBy || null,
      })
      if (dbError) throw dbError

      await fetch('/api/notify/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, title: form.title, artistName: prof.full_name, price, sizes: SIZES }),
      })
      toast.success(`Artwork submitted! SKU: ${sku}`, { id: 'upload' })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, { id: 'upload' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Upload new artwork</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Upload both your hi-res print file and a watermarked preview for buyers.</p>

      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Hi-res print file <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>— private, for printing only</span></p>
      <div className="upload-zone" style={{ marginBottom: 20, padding: hiresThumb ? 0 : undefined, overflow: 'hidden' }} onClick={() => document.getElementById('hires-input')?.click()}>
        {hiresThumb ? <img src={hiresThumb} alt="hi-res" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} /> : (
          <><div style={{ fontSize: 24, marginBottom: 6 }}>🖨</div><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Tap to upload hi-res file</p><p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG or PNG · min 200dpi · up to 35MB</p></>
        )}
      </div>
      <input type="file" id="hires-input" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0] || null, setHiresFile, setHiresThumb)} />

      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Preview image <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>— shown to buyers, add your watermark first</span></p>
      <div className="upload-zone" style={{ marginBottom: 20, padding: previewThumb ? 0 : undefined, overflow: 'hidden' }} onClick={() => document.getElementById('preview-input')?.click()}>
        {previewThumb ? <img src={previewThumb} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} /> : (
          <><div style={{ fontSize: 24, marginBottom: 6 }}>🖼</div><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Tap to upload preview image</p><p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG or PNG · 800–1200px · watermark before uploading</p></>
        )}
      </div>
      <input type="file" id="preview-input" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0] || null, setPreviewFile, setPreviewThumb)} />

      <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Name your artwork" /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell buyers about this piece..." /></div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Painting by <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>— optional, if you represent another artist</span></label>
        <input className="form-input" value={form.paintingBy} onChange={e => setForm({ ...form, paintingBy: e.target.value })} placeholder="e.g. Ahmed Naif" />
      </div>
      <div className="form-group">
        <label className="form-label">Your artwork price (MVR)</label>
        <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 800" style={{ maxWidth: 160 }} />
        {price > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', marginTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>What buyers pay (transparent breakdown)</p>
            {[
              ['Your artwork price', formatMVR(price), ''],
              ['A4 printing fee (FinePrint)', formatMVR(PRINTING_FEES['A4']), 'var(--color-text-muted)'],
              ['A3 printing fee (FinePrint)', formatMVR(PRINTING_FEES['A3']), 'var(--color-text-muted)'],
              ['Delivery handling (optional)', 'MVR 100', 'var(--color-text-muted)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: (c as string) || 'var(--color-text)' }}>
                <span>{k}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid var(--color-border)', marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                <span>Buyer pays for A4 (delivery)</span><span>{formatMVR(price + PRINTING_FEES['A4'] + 100)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                <span>Buyer pays for A3 (delivery)</span><span>{formatMVR(price + PRINTING_FEES['A3'] + 100)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: 'var(--color-teal)' }}>
                <span>You earn (after 5% platform fee)</span><span>{formatMVR(artistEarns)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', marginBottom: 14, marginTop: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>{nextSku} ← next available</p>
      </div>
      <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>
    </div>
  )
}

function OffersTab({ artworks, onRefresh }: any) {
  const [label, setLabel] = useState('Eid Special')
  const [pct, setPct] = useState(15)
  const [target, setTarget] = useState('all')
  const supabase = createClient()
  const previewPrice = artworks[0]?.price || 800
  const discount = Math.round(previewPrice * pct / 100)
  const discountedPrice = previewPrice - discount
  const platformFee = Math.round(discountedPrice * PLATFORM_FEE / 100)
  const artistEarns = discountedPrice - platformFee

  async function activate() {
    const updates = target === 'all' ? artworks.map((a: any) => a.id) : [parseInt(target)]
    for (const id of updates) await supabase.from('artworks').update({ offer_label: label, offer_pct: pct }).eq('id', id)
    toast.success('Offer activated!'); onRefresh()
  }
  async function removeOffer(id: number) {
    await supabase.from('artworks').update({ offer_label: null, offer_pct: null }).eq('id', id)
    toast.success('Offer removed'); onRefresh()
  }
  const activeOffers = artworks.filter((a: any) => a.offer_pct)

  return (
    <div>
      <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Create an offer</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Discounts come entirely out of your share. Platform fee (5%) is applied after discount.</p>
        <div className="form-group"><label className="form-label">Apply to</label>
          <select className="form-input" value={target} onChange={e => setTarget(e.target.value)}>
            <option value="all">All my artworks</option>
            {artworks.map((a: any) => <option key={a.id} value={a.id}>{a.sku} — {a.title}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Offer label</label><input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Eid Special" /></div>
        <div className="form-group"><label className="form-label">Discount: {pct}%</label><input type="range" min={5} max={50} step={5} value={pct} onChange={e => setPct(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--border-radius-md)', padding: 14, marginTop: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Payout preview — artwork price at {formatMVR(previewPrice)}</p>
          {[['Your artwork price', formatMVR(previewPrice), ''], [`Discount (${pct}%)`, `− ${formatMVR(discount)}`, 'var(--color-red)'],
            ['Discounted price', formatMVR(discountedPrice), ''], ['Platform fee (5%)', `− ${formatMVR(platformFee)}`, 'var(--color-text-muted)'],
            ['Your earnings', formatMVR(artistEarns), 'var(--color-teal)']
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: (c as string) || 'var(--color-text)' }}>
              <span>{k}</span><span style={{ fontWeight: k === 'Your earnings' ? 500 : 400 }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={activate}>Activate offer</button>
      </div>
      {activeOffers.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Active offers</p>
          {activeOffers.map((a: any) => {
            const discounted = a.price - Math.round(a.price * a.offer_pct / 100)
            const earn = discounted - Math.round(discounted * PLATFORM_FEE / 100)
            return (
              <div key={a.id} style={{ border: '0.5px solid var(--color-red)', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-lg)', padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.offer_pct}% off</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.sku} · You earn {formatMVR(earn)} after platform fee</p>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => removeOffer(a.id)}>Remove</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PayoutsTab({ profile, pendingEarnings, payouts, onRefresh, onViewRemittance }: any) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bankName: '', accountName: '', accountNumber: '' })
  const [submitting, setSubmitting] = useState(false)
  const [celebrated, setCelebrated] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fp_celebrated_payouts') || '[]')
    setCelebrated(stored)
    const newlyPaid = payouts.filter((p: any) => p.status === 'paid' && !stored.includes(p.id))
    if (newlyPaid.length > 0) {
      setTimeout(() => {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#5DCAA5', '#9FE1CB', '#1a1a1a', '#f3d6f5'] })
        })
      }, 400)
      const updated = [...stored, ...newlyPaid.map((p: any) => p.id)]
      localStorage.setItem('fp_celebrated_payouts', JSON.stringify(updated))
      setCelebrated(updated)
    }
  }, [payouts])

  const now = new Date()
  const alreadyRequested = false
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  async function submitRequest() {
    if (!form.bankName || !form.accountName || !form.accountNumber) { toast.error('Please fill in all bank details'); return }
    if (pendingEarnings <= 0) { toast.error('No pending earnings to request'); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payouts').insert({
        artist_id: user!.id, amount: pendingEarnings,
        bank_name: form.bankName, account_name: form.accountName, account_number: form.accountNumber, status: 'pending',
      })
      if (error) throw error
      await fetch('/api/notify/payout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: profile.full_name, amount: pendingEarnings, bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber }),
      })
      toast.success('Payout request submitted!')
      setShowForm(false)
      setForm({ bankName: '', accountName: '', accountNumber: '' })
      onRefresh()
    } catch (err: any) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  const paidPayouts = payouts.filter((p: any) => p.status === 'paid')
  const pendingPayouts = payouts.filter((p: any) => p.status === 'pending')

  return (
    <div>
      <style>{`@keyframes badgePop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.25);opacity:1}100%{transform:scale(1);opacity:1}}`}</style>

      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Pending payout</p>
            <p style={{ fontSize: 28, fontWeight: 500, marginTop: 4, fontFamily: 'var(--font-display)' }}>{formatMVR(pendingEarnings)}</p>
          </div>
          {!alreadyRequested && pendingEarnings > 0 && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Request payout'}</button>
          )}
        </div>
        {pendingEarnings <= 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No pending earnings to request.</p>}
        {showForm && (
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--color-border)', paddingTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>Enter your bank details for this payout of <strong>{formatMVR(pendingEarnings)}</strong>.</p>
            <div className="form-group"><label className="form-label">Bank name</label><input className="form-input" placeholder="e.g. Bank of Maldives" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Account holder name</label><input className="form-input" placeholder="Full name as on account" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Account number</label><input className="form-input" placeholder="Your account number" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></div>
            <button className="btn btn-primary btn-full" onClick={submitRequest} disabled={submitting}>{submitting ? 'Submitting...' : `Request payout of ${formatMVR(pendingEarnings)}`}</button>
          </div>
        )}
      </div>

      {pendingPayouts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Pending requests</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {pendingPayouts.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Requested {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className="badge" style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-muted)' }}>pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidPayouts.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payout history</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {paidPayouts.map((p: any) => {
              const isNew = !celebrated.includes(p.id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12, background: isNew ? 'rgba(95,202,165,0.06)' : 'transparent', transition: 'background 1s ease' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Requested {new Date(p.created_at).toLocaleDateString()}
                      {p.paid_at ? ` · Paid ${new Date(p.paid_at).toLocaleDateString()}` : ''}
                    </p>
                    <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => onViewRemittance(p)}>📄 View remittance</button>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20, animation: isNew ? 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none' }}>✓ paid</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ExportTab({ onExport, orders }: any) {
  const today = new Date().toISOString().split('T')[0]
  const yearStart = `${new Date().getFullYear()}-01-01`
  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(today)
  const filtered = orders.filter((o: any) => o.created_at >= from && o.created_at <= to + 'T23:59:59' && o.status === 'approved')
  const gross = filtered.reduce((s: number, o: any) => s + o.original_price, 0)
  const earned = filtered.reduce((s: number, o: any) => s + o.artist_earnings, 0)

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Export my sales</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Download a CSV of your approved sales for any date range.</p>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[['Orders', filtered.length], ['Gross', `MVR ${gross.toLocaleString()}`], ['Earnings', `MVR ${earned.toLocaleString()}`]].map(([l, v]) => (
          <div key={l as string} className="stat-card"><p className="stat-label">{l}</p><p className="stat-value" style={{ fontSize: 16 }}>{v}</p></div>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="form-group"><label className="form-label">From</label><input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">To</label><input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onExport(from, to)}>Download CSV</button>
    </div>
  )
}

function ProfileTab({ profile, onSave }: any) {
  const [form, setForm] = useState({ bio: profile.bio || '', location: profile.location || '', instagram: profile.instagram || '', linkedin: profile.linkedin || '', facebook: profile.facebook || '', tiktok: profile.tiktok || '', website: profile.website || '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${profile.id}.${ext}`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
      await supabase.from('profiles').update({ ...form, avatar_url: avatarUrl }).eq('id', profile.id)
      onSave({ ...form, avatar_url: avatarUrl })
      toast.success('Profile saved!')
    } catch (err: any) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Your public profile</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-background-secondary)', flexShrink: 0, cursor: 'pointer', border: '2px dashed var(--color-border)' }} onClick={() => document.getElementById('avatar-input')?.click()}>
          {avatarPreview ? <img src={avatarPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>}
        </div>
        <div><p style={{ fontSize: 13, fontWeight: 500 }}>Profile picture</p><p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Tap to upload · JPG or PNG · shown on storefront</p></div>
      </div>
      <input type="file" id="avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
      <div className="form-group"><label className="form-label">Bio</label><textarea className="form-input" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell buyers about yourself and your art..." /></div>
      <div className="form-group"><label className="form-label">Island / Location</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Malé, Kaafu Atoll" /></div>
      <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4, marginBottom: 10 }}>Social links</p>
      <div className="form-group"><label className="form-label">Instagram</label><input className="form-input" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@yourusername" /></div>
      <div className="form-group"><label className="form-label">TikTok</label><input className="form-input" value={form.tiktok} onChange={e => setForm({ ...form, tiktok: e.target.value })} placeholder="@yourusername" /></div>
      <div className="form-group"><label className="form-label">Facebook</label><input className="form-input" value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="facebook.com/yourpage" /></div>
      <div className="form-group"><label className="form-label">LinkedIn</label><input className="form-input" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} placeholder="linkedin.com/in/yourprofile" /></div>
      <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yoursite.com" /></div>
      <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
    </div>
  )
}
