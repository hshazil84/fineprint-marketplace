'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import Link from 'next/link'
import Header from '@/app/components/Header'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order received', desc: 'Your order has been placed and is awaiting payment verification.' },
  { key: 'approved', label: 'Payment verified', desc: 'Your payment has been confirmed and your print is being prepared.' },
  { key: 'printing', label: 'Printing', desc: 'Your artwork is being printed on premium Hahnemuhle paper.' },
  { key: 'ready', label: 'Ready', desc: 'Your print is ready for pickup or has been dispatched.' },
]

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const invoice = searchParams.get('invoice')
    if (invoice) {
      setQuery(invoice)
      search(invoice)
    }
  }, [])

  async function search(val?: string) {
    const q = (val || query).trim()
    if (!q) return
    setLoading(true)
    setNotFound(false)
    setOrders([])
    setSearched(true)
    const isInvoice = q.startsWith('INV-')
    const isEmail = q.includes('@')
    let queryBuilder = supabase
      .from('orders')
      .select('*, artworks(title, sku, preview_url, profiles:artist_id(full_name))')
      .order('created_at', { ascending: false })
    if (isInvoice) {
      queryBuilder = queryBuilder.eq('invoice_number', q)
    } else if (isEmail) {
      queryBuilder = queryBuilder.eq('buyer_email', q.toLowerCase())
    } else {
      queryBuilder = queryBuilder.eq('buyer_phone', q)
    }
    const { data } = await queryBuilder
    if (!data || data.length === 0) setNotFound(true)
    else {
      setOrders(data)
      if (data.length === 1) setExpandedId(data[0].id)
    }
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    search()
  }

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 600 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Track your order</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Enter your email address, phone number, or invoice number to find your orders.
        </p>
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Email, phone or invoice number</label>
            <input
              className="form-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="you@example.com · +960 xxx xxxx · INV-2026-..."
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
              You can use the email or phone you provided at checkout, or your invoice number from your confirmation email.
            </p>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Searching...' : 'Find my orders'}
          </button>
        </form>

        {notFound && searched && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No orders found</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              We could not find any orders matching those details. Please check and try again.
              <br />Need help? Email us at{' '}
              <a href="mailto:hello@fineprintmv.com" style={{ color: 'var(--color-teal)' }}>hello@fineprintmv.com</a>
            </p>
          </div>
        )}

        {orders.length > 0 && (
          <div>
            {orders.length > 1 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Found <strong>{orders.length} orders</strong> — tap any to see details.
              </p>
            )}
            {orders.map(order => {
              const isExpanded = expandedId === order.id
              const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']
              const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status)
              const displayStep = currentStep === -1 ? 0 : currentStep
              return (
                <div key={order.id} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {order.artworks?.preview_url && (
                      <img src={order.artworks.preview_url} alt={order.artworks.title} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, pointerEvents: 'none' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{order.artworks?.title} — {order.print_size}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                        <span className={'badge badge-' + order.status}>{order.status}</span>
                        <span className="sku-tag">{order.order_sku}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(order.total_paid)}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>{isExpanded ? '▲' : '▼'}</p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '20px 20px' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 16, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order status</p>
                      <div style={{ position: 'relative', marginBottom: 24 }}>
                        <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />
                        <div style={{ position: 'absolute', left: 15, top: 0, width: 2, background: 'var(--color-teal)', height: (displayStep / (STATUS_STEPS.length - 1) * 100) + '%', transition: 'height 0.5s ease' }} />
                        {STATUS_STEPS.map((step, i) => {
                          const done = i < displayStep
                          const active = i === displayStep
                          return (
                            <div key={step.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: i < STATUS_STEPS.length - 1 ? 20 : 0, position: 'relative' }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                                background: done ? 'var(--color-teal)' : active ? '#1a1a1a' : 'var(--color-background-secondary)',
                                color: done || active ? '#fff' : 'var(--color-text-muted)',
                                boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.06)' : 'none',
                              }}>
                                {done ? '✓' : i + 1}
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
                            <p style={{ fontSize: 13, color: '#A32D2D' }}>
                              Your order was not approved. Please contact us at{' '}
                              <a href="mailto:hello@fineprintmv.com" style={{ color: '#A32D2D' }}>hello@fineprintmv.com</a>
                            </p>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order details</p>
                      <div style={{ marginBottom: 16 }}>
                        {[
                          ['Invoice', order.invoice_number],
                          ['Print size', order.print_size],
                          ['Artwork price', formatMVR(order.original_price)],
                          [order.print_size + ' printing', formatMVR(printingFee)],
                          ['Delivery', order.delivery_method === 'pickup' ? 'Pickup — Free' : order.delivery_island + ', ' + order.delivery_atoll + ' — ' + formatMVR(order.handling_fee)],
                          ['Total paid', formatMVR(order.total_paid)],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                            <span style={{ fontWeight: k === 'Total paid' ? 500 : 400, fontFamily: k === 'Invoice' ? 'var(--font-mono)' : 'inherit', fontSize: k === 'Invoice' ? 11 : 13 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {order.delivery_method === 'pickup' ? (
                        <div style={{ background: 'var(--color-teal-light)', border: '0.5px solid var(--color-teal)', borderRadius: 8, padding: '12px 14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-teal-dark)', marginBottom: 4 }}>Pickup at FinePrint Studio</p>
                          <p style={{ fontSize: 12, color: 'var(--color-teal-dark)', lineHeight: 1.6 }}>
                            We will email you when your print is ready for collection. Studio hours: Sun - Thu, 9am - 6pm.
                          </p>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.02)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '12px 14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Delivery to</p>
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                            {order.delivery_island}, {order.delivery_atoll}, Maldives
                            {order.delivery_notes && <><br />{order.delivery_notes}</>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>}>
      <TrackOrderContent />
    </Suspense>
  )
}
