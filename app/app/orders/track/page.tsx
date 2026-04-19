'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import toast from 'react-hot-toast'
import Link from 'next/link'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order received', desc: 'Your order has been placed and is awaiting payment verification.' },
  { key: 'approved', label: 'Payment verified', desc: 'Your payment has been confirmed and your print is being prepared.' },
  { key: 'printing', label: 'Printing', desc: 'Your artwork is being printed on premium Hahnemühle paper.' },
  { key: 'ready', label: 'Ready', desc: 'Your print is ready for pickup or has been dispatched.' },
]

export default function TrackOrderPage() {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNotFound(false)
    setOrder(null)

    const { data } = await supabase
      .from('orders')
      .select('*, artworks(title, sku, preview_url, profiles:artist_id(full_name))')
      .or(`invoice_number.eq.${query.trim()},buyer_email.eq.${query.trim().toLowerCase()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) setNotFound(true)
    else setOrder(data)
    setLoading(false)
  }

  const printingFee = order ? (order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']) : 0
  const currentStep = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1
  const displayStep = currentStep === -1 ? 0 : currentStep

  return (
    <div>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <Link href="/storefront" className="btn btn-sm">Browse prints</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 600 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Track your order</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>Enter your invoice number or email address to check your order status.</p>

        <form onSubmit={handleSearch} className="card" style={{ marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Invoice number or email</label>
            <input
              className="form-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="INV-2026-... or you@example.com"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Searching...' : 'Track order'}
          </button>
        </form>

        {notFound && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Order not found</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Please check your invoice number or email address and try again.
              If you need help, contact us at <a href="mailto:hello@fineprintmv.com" style={{ color: 'var(--color-teal)' }}>hello@fineprintmv.com</a>
            </p>
          </div>
        )}

        {order && (
          <div>
            {/* Order header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {order.artworks?.preview_url && (
                  <img src={order.artworks.preview_url} alt={order.artworks.title} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0, pointerEvents: 'none' }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{order.artworks?.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>by {order.artworks?.profiles?.full_name}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="sku-tag">{order.order_sku}</span>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 500 }}>{formatMVR(order.total_paid)}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{order.print_size} print</p>
                </div>
              </div>
            </div>

            {/* Status tracker */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Order status</p>
              <div style={{ position: 'relative' }}>
                {/* Progress line */}
                <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />
                <div style={{ position: 'absolute', left: 15, top: 0, width: 2, background: 'var(--color-teal)', height: `${(displayStep / (STATUS_STEPS.length - 1)) * 100}%`, transition: 'height 0.5s ease' }} />

                {STATUS_STEPS.map((step, i) => {
                  const done = i < displayStep
                  const active = i === displayStep
                  const rejected = order.status === 'rejected' && i === 0
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: i < STATUS_STEPS.length - 1 ? 24 : 0, position: 'relative' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                        background: rejected ? 'var(--color-red)' : done ? 'var(--color-teal)' : active ? '#1a1a1a' : 'var(--color-background-secondary)',
                        color: done || active ? '#fff' : 'var(--color-text-muted)',
                        border: active && !done ? '2px solid #1a1a1a' : 'none',
                        boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.08)' : 'none',
                      }}>
                        {done ? '✓' : rejected ? '✕' : i + 1}
                      </div>
                      <div style={{ paddingTop: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#111' : done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{step.label}</p>
                        {active && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.5 }}>{step.desc}</p>}
                      </div>
                    </div>
                  )
                })}

                {order.status === 'rejected' && (
                  <div style={{ marginTop: 16, background: 'var(--color-red-light)', border: '0.5px solid var(--color-red)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 13, color: '#A32D2D' }}>Your order was not approved. Please contact us at <a href="mailto:hello@fineprintmv.com" style={{ color: '#A32D2D' }}>hello@fineprintmv.com</a> for assistance.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order details */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Order details</p>
              {[
                ['Invoice', order.invoice_number],
                ['Order placed', new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
                ['Print size', order.print_size],
                ['Artwork price', formatMVR(order.original_price)],
                [`${order.print_size} printing`, formatMVR(printingFee)],
                ['Delivery', order.delivery_method === 'pickup' ? 'Pickup — Free' : `Deliver to ${order.delivery_island}, ${order.delivery_atoll} — ${formatMVR(order.handling_fee)}`],
                ['Total paid', formatMVR(order.total_paid)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: k === 'Total paid' ? 500 : 400, fontFamily: k === 'Invoice' ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Delivery info */}
            {order.delivery_method === 'pickup' ? (
              <div className="card" style={{ background: 'var(--color-teal-light)', border: '0.5px solid var(--color-teal)' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-teal-dark)', marginBottom: 6 }}>🏪 Pickup at FinePrint Studio</p>
                <p style={{ fontSize: 12, color: 'var(--color-teal-dark)', lineHeight: 1.6 }}>
                  We will email you at <strong>{order.buyer_email}</strong> when your print is ready for collection. Studio hours: Sun – Thu, 9am – 6pm.
                </p>
              </div>
            ) : (
              <div className="card" style={{ background: 'rgba(0,0,0,0.02)', border: '0.5px solid var(--color-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>📦 Delivery address</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {order.delivery_island}, {order.delivery_atoll}, Maldives
                  {order.delivery_notes && <><br />{order.delivery_notes}</>}
                </p>
              </div>
            )}

            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 16 }}>
              Questions? Email us at{' '}
              <a href="mailto:hello@fineprintmv.com" style={{ color: 'var(--color-teal)' }}>hello@fineprintmv.com</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
