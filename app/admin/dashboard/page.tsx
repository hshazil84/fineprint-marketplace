'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/app/components/Header'

const TABS = ['orders', 'artists', 'listings', 'offers', 'customers', 'export']
const ORDER_STATUSES = ['pending', 'approved', 'printing', 'ready', 'completed', 'rejected']

function OrderRow({ order, onAction, onStatusChange, onViewInvoice, onViewSlip }: any) {
  const [updating, setUpdating] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const artistDisplay = order.artworks?.profiles?.display_name || order.artworks?.profiles?.full_name

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{order.invoice_number}</p>
            <span className="sku-tag">{order.order_sku}</span>
            <span className={`badge badge-${order.status}`}>{order.status}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{order.artworks?.title} by {artistDisplay}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {order.buyer_name} · {new Date(order.created_at).toLocaleDateString()} · {formatMVR(order.total_paid)}
            {' · '}{order.delivery_method === 'pickup' ? '🏪 Pickup' : `📦 Deliver → ${order.delivery_island}`}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select className="form-input"
          style={{ fontSize: 12, padding: '5px 10px', maxWidth: 150, height: 'auto', cursor: 'pointer' }}
          value={order.status} onChange={e => updateStatus(e.target.value)} disabled={updating}>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
          Notify buyer
        </label>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {order.slip_url && (
            <button className="btn btn-sm"
              style={{ fontSize: 11, padding: '3px 10px', background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', border: 'none' }}
              onClick={onViewSlip}>📎 Slip</button>
          )}
          {order.status !== 'pending' && order.status !== 'rejected' && (
            <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onViewInvoice}>📄 Invoice</button>
          )}
          {order.status === 'pending' && !order.slip_url && (
            <>
              <button className="btn btn-sm btn-success" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'approve')}>Approve</button>
              <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'reject')}>Reject</button>
            </>
          )}
        </div>
      </div>
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
