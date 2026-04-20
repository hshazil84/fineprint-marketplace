'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import toast from 'react-hot-toast'

export function SlipModal({ order, onClose, onAction }: {
  order: any
  onClose: () => void
  onAction: (invoiceNumber: string, action: 'approve' | 'reject') => void
}) {
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
              ['Artist', order.artworks?.profiles?.display_name || order.artworks?.profiles?.full_name],
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
