'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { SlipModal } from '@/app/admin/components/SlipModal'
import { InvoiceModal } from '@/app/admin/components/InvoiceModal'
import toast from 'react-hot-toast'

const COLUMNS = [
  { key: 'pending',   label: 'Pending',   color: '#633806', bg: '#FAEEDA', border: '#EF9F27' },
  { key: 'approved',  label: 'Approved',  color: '#185FA5', bg: '#E6F1FB', border: '#5B9FD4' },
  { key: 'printing',  label: 'Printing',  color: '#5B3FA5', bg: '#EEE6FB', border: '#9B7FD4' },
  { key: 'completed', label: 'Delivered', color: '#0F6E56', bg: '#E1F5EE', border: '#5DCAA5' },
]

const ALL_STATUSES = ['pending', 'approved', 'printing', 'ready', 'completed', 'rejected']

const NEXT_STATUS: Record<string, string> = {
  pending:  'approved',
  approved: 'printing',
  printing: 'completed',
}

const NEXT_LABEL: Record<string, string> = {
  pending:  '✓ Approve',
  approved: 'Mark printing',
  printing: 'Mark delivered',
}

function PaymentBadge({ method }: { method: string }) {
  if (method === 'swipe') return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#6A0AF2', color: '#fff' }}>Swipe</span>
  )
  return (
    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#E6F1FB', color: '#185FA5' }}>BML</span>
  )
}

function DeliveryBadge({ method, island }: { method: string; island?: string }) {
  if (method === 'pickup') return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#f0f0ec', color: '#666' }}>Pickup</span>
  )
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#f0f0ec', color: '#666' }}>📦 {island || 'Delivery'}</span>
  )
}

function KanbanCard({ order, onStatusChange, onViewInvoice, onViewSlip, onPrintLabel, onDragStart }: any) {
  const [updating, setUpdating]   = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [sendEmail, setSendEmail] = useState(true)

  const col          = COLUMNS.find(c => c.key === order.status)
  const artworkTitle = order.artworks?.title || order.order_sku || '—'
  const artistName   = order.artworks?.profiles?.display_name || order.artworks?.profiles?.full_name || '—'
  const next         = NEXT_STATUS[order.status]

  async function moveTo(newStatus: string) {
    if (newStatus === order.status || updating) return
    setUpdating(true)
    const shouldNotify = sendEmail && newStatus === 'completed'
    const res = await fetch('/api/orders/status', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invoiceNumber: order.invoice_number, status: newStatus, sendEmail: shouldNotify }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(shouldNotify ? 'Moved — buyer notified!' : 'Status updated')
      onStatusChange(order.id, newStatus)
    } else {
      toast.error(data.error || 'Failed')
    }
    setUpdating(false)
  }

  async function handleApprove() {
    setUpdating(true)
    const res = await fetch('/api/orders/approve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invoiceNumber: order.invoice_number, action: 'approve' }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Order approved — invoice sent!')
      onStatusChange(order.id, 'approved')
    } else {
      toast.error(data.error)
    }
    setUpdating(false)
  }

  async function handleReject() {
    setUpdating(true)
    const res = await fetch('/api/orders/approve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invoiceNumber: order.invoice_number, action: 'reject' }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Order rejected')
      onStatusChange(order.id, 'rejected')
    } else {
      toast.error(data.error)
    }
    setUpdating(false)
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order)}
      style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 10, cursor: 'grab', userSelect: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}
    >
      {col && <div style={{ height: 3, background: col.border }} />}

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', margin: 0 }}>{order.invoice_number}</p>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1a1a1a', flexShrink: 0 }}>{formatMVR(order.total_paid)}</p>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artworkTitle}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>by {artistName}</p>
        <p style={{ fontSize: 12, fontWeight: 500, margin: '0 0 8px', color: '#1a1a1a' }}>{order.buyer_name}</p>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <PaymentBadge method={order.payment_method} />
          <DeliveryBadge method={order.delivery_method} island={order.delivery_island} />
          {order.source === 'pos' && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#1a1a1a', color: '#fff' }}>POS</span>
          )}
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#f0f0ec', color: '#888' }}>
            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {order.status === 'pending' ? (
            <>
              <button onClick={handleApprove} disabled={updating}
                style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: 'none', borderRadius: 8, background: '#1D9E75', color: '#fff', fontWeight: 600, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.6 : 1 }}>
                {updating ? '...' : '✓ Approve'}
              </button>
              <button onClick={handleReject} disabled={updating}
                style={{ fontSize: 11, padding: '6px 8px', border: 'none', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontWeight: 500, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.6 : 1 }}>
                Reject
              </button>
            </>
          ) : next ? (
            <button onClick={() => moveTo(next)} disabled={updating}
              style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: 'none', borderRadius: 8, background: col?.bg || '#f0f0ec', color: col?.color || '#333', fontWeight: 500, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.6 : 1 }}>
              {updating ? '...' : NEXT_LABEL[order.status] || '→'}
            </button>
          ) : null}
          <button onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 11, padding: '6px 10px', border: '0.5px solid #e8e8e4', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>

        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #f0f0ec' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select className="form-input"
                style={{ fontSize: 11, padding: '4px 8px', flex: 1, height: 'auto' }}
                value={order.status}
                onChange={e => moveTo(e.target.value)}
                disabled={updating}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                Notify
              </label>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {order.slip_url && (
                <button className="btn btn-sm" style={{ fontSize: 10, background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', border: 'none' }} onClick={onViewSlip}>Slip</button>
              )}
              {order.status !== 'pending' && order.status !== 'rejected' && (
                <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={onViewInvoice}>Invoice</button>
              )}
              {(order.status === 'approved' || order.status === 'printing') && (
                <button className="btn btn-sm" style={{ fontSize: 10, background: '#1a1a1a', color: '#fff', border: 'none' }} onClick={() => onPrintLabel(order)}>Label</button>
              )}
            </div>

            {order.delivery_method === 'delivery' && order.delivery_island && (
              <div style={{ marginTop: 8, background: '#f8f8f6', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>Deliver to</p>
                <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>{order.delivery_island}, {order.delivery_atoll}</p>
                {order.buyer_phone && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{order.buyer_phone}</p>}
              </div>
            )}

            {order.delivery_notes && (
              <div style={{ marginTop: 6, background: '#FAEEDA', borderRadius: 8, padding: '6px 10px' }}>
                <p style={{ fontSize: 11, color: '#633806', margin: 0 }}>📝 {order.delivery_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function OrdersTab({ onBadgeRefresh }: { onBadgeRefresh: () => void }) {
  const [orders, setOrders]               = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [invoiceOrder, setInvoiceOrder]   = useState<any>(null)
  const [view, setView]                   = useState<'kanban' | 'list'>('kanban')
  const [showRejected, setShowRejected]   = useState(false)
  const [dragging, setDragging]           = useState<any>(null)
  const [dragOver, setDragOver]           = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks(title, sku, artist_id, paper_type, profiles:artist_id(full_name, display_name)), order_items(print_size, artwork_id, artworks(title, sku, paper_type, profiles:artist_id(full_name, display_name)))')
      .order('created_at', { ascending: false })
    if (data) setOrders([...data])
    setLoading(false)
  }

  function optimisticMove(orderId: number, newStatus: string) {
  setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  onBadgeRefresh()
}

  async function moveOrder(order: any, newStatus: string) {
    if (order.status === newStatus) return
    optimisticMove(order.id, newStatus)

    if (newStatus === 'approved' && order.status === 'pending') {
      const res = await fetch('/api/orders/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceNumber: order.invoice_number, action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Order approved — invoice sent!')
        fetchOrders()
      } else {
        toast.error(data.error)
        fetchOrders()
      }
    } else if (newStatus === 'rejected') {
      const res = await fetch('/api/orders/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceNumber: order.invoice_number, action: 'reject' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Order rejected')
      } else {
        toast.error(data.error)
        fetchOrders()
      }
    } else {
      const res = await fetch('/api/orders/status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceNumber: order.invoice_number, status: newStatus, sendEmail: newStatus === 'delivered' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Moved to ' + newStatus)
      } else {
        toast.error(data.error)
        fetchOrders()
      }
    }
  }

  async function handlePrintLabel(order: any) {
    try {
      const { printLabel } = await import('@/lib/label')
      const items = order.order_items && order.order_items.length > 0
        ? order.order_items
        : [{ print_size: order.print_size || 'A4', artworks: order.artworks }]
      const sizeCounts: Record<string, number> = {}
      items.forEach((item: any) => {
        const size = item.print_size || 'A4'
        sizeCounts[size] = (sizeCounts[size] || 0) + 1
      })
      const sizes     = Object.keys(sizeCounts)
      const hasLarge  = sizes.some(s => s === 'A2' || s === '12x16')
      const hasSmall  = sizes.some(s => s === 'A4' || s === 'A3')
      const packaging = hasLarge && hasSmall ? 'Flat mailer + Tube' : hasLarge ? 'Tube' : 'Flat mailer'
      await printLabel({
        invoiceNumber:  order.invoice_number,
        orderSku:       order.order_sku,
        buyerName:      order.buyer_name,
        buyerPhone:     order.buyer_phone    || '',
        deliveryIsland: order.delivery_island || '',
        deliveryAtoll:  order.delivery_atoll  || '',
        deliveryMethod: order.delivery_method,
        sizeCounts,
        packaging,
        approvedAt: order.approved_at || order.created_at,
      })
      toast.success('Packing label downloaded!')
    } catch (err: any) {
      toast.error('Label error: ' + err.message)
    }
  }

  const filtered     = orders.filter(o =>
    !search ||
    o.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    (o.artworks?.title || '').toLowerCase().includes(search.toLowerCase()) ||
    o.order_sku?.toLowerCase().includes(search.toLowerCase())
  )

  const rejected     = filtered.filter(o => o.status === 'rejected')
  const mainFiltered = filtered.filter(o => o.status !== 'rejected')

  const pending   = orders.filter(o => o.status === 'pending').length
  const approved  = orders.filter(o => o.status === 'approved').length
  const printing  = orders.filter(o => o.status === 'printing').length
  const delivered = orders.filter(o => o.status === 'completed').length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading orders...</div>

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['Pending',   pending,   '#FAEEDA', '#633806'],
          ['Approved',  approved,  '#E6F1FB', '#185FA5'],
          ['Printing',  printing,  '#EEE6FB', '#5B3FA5'],
          ['Delivered', delivered, '#E1F5EE', '#0F6E56'],
        ].map(([label, value, bg, color]) => (
          <div key={label as string} className="stat-card" style={{ background: (value as number) > 0 ? bg as string : undefined }}>
            <p className="stat-label" style={{ color: (value as number) > 0 ? color as string : undefined }}>{label as string}</p>
            <p className="stat-value" style={{ color: (value as number) > 0 ? color as string : undefined }}>{value as number}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Search invoice, buyer, artwork..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')}>Clear ×</button>}
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => setView('kanban')} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, background: view === 'kanban' ? '#1a1a1a' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--color-text-muted)' }}>Board</button>
          <button onClick={() => setView('list')}   style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, background: view === 'list'   ? '#1a1a1a' : 'transparent', color: view === 'list'   ? '#fff' : 'var(--color-text-muted)' }}>List</button>
        </div>
      </div>

      {view === 'kanban' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, width: '100%' }}>
            {COLUMNS.map(col => {
              const colOrders  = mainFiltered.filter(o => o.status === col.key)
              const isDragOver = dragOver === col.key
              return (
                <div
                  key={col.key}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOver(null)
                    if (dragging) moveOrder(dragging, col.key)
                    setDragging(null)
                  }}
                  style={{ background: isDragOver ? col.bg : 'transparent', borderRadius: 12, padding: isDragOver ? 4 : 0, transition: 'background 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '7px 10px', background: col.bg, borderRadius: 10, border: '0.5px solid ' + col.border }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: col.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, background: col.border, color: '#fff', borderRadius: 20, padding: '1px 8px', minWidth: 20, textAlign: 'center' }}>
                      {colOrders.length}
                    </span>
                  </div>

                  {isDragOver && (
                    <div style={{ border: '2px dashed ' + col.border, borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 10, background: '#fff' }}>
                      <p style={{ fontSize: 12, color: col.color, margin: 0, fontWeight: 500 }}>Drop → {col.label}</p>
                    </div>
                  )}

                  {colOrders.length === 0 && !isDragOver ? (
                    <div style={{ border: '1px dashed ' + col.border, borderRadius: 10, padding: '24px 12px', textAlign: 'center', opacity: 0.4 }}>
                      <p style={{ fontSize: 11, color: col.color, margin: 0 }}>No orders</p>
                    </div>
                  ) : colOrders.map(order => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      onStatusChange={(orderId: number, newStatus: string) => optimisticMove(orderId, newStatus)}
                      onViewInvoice={() => setInvoiceOrder(order)}
                      onViewSlip={() => setSelectedOrder(order)}
                      onPrintLabel={handlePrintLabel}
                      onDragStart={(o: any) => setDragging(o)}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowRejected(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontSize: 13, color: '#A32D2D', fontWeight: 500 }}
            >
              <span style={{ fontSize: 10 }}>{showRejected ? '▼' : '▶'}</span>
              Rejected
              <span style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20, fontWeight: 600, border: '0.5px solid #F09595' }}>
                {rejected.length}
              </span>
            </button>
            {showRejected && rejected.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 8 }}>
                {rejected.map(order => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onStatusChange={(orderId: number, newStatus: string) => optimisticMove(orderId, newStatus)}
                    onViewInvoice={() => setInvoiceOrder(order)}
                    onViewSlip={() => setSelectedOrder(order)}
                    onPrintLabel={handlePrintLabel}
                    onDragStart={(o: any) => setDragging(o)}
                  />
                ))}
              </div>
            )}
            {showRejected && rejected.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>No rejected orders.</p>
            )}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders found.</p>
          ) : filtered.map((o: any) => (
            <div key={o.id} style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{o.invoice_number}</p>
                  <span className={'badge badge-' + o.status}>{o.status}</span>
                  <PaymentBadge method={o.payment_method} />
                  {o.source === 'pos' && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#1a1a1a', color: '#fff' }}>POS</span>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  {o.artworks?.title || o.order_sku} · {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{formatMVR(o.total_paid)}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {o.slip_url && (
                    <button className="btn btn-sm" style={{ fontSize: 10, background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', border: 'none' }} onClick={() => setSelectedOrder(o)}>Slip</button>
                  )}
                  {o.status !== 'pending' && o.status !== 'rejected' && (
                    <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setInvoiceOrder(o)}>Invoice</button>
                  )}
                  {(o.status === 'approved' || o.status === 'printing') && (
                    <button className="btn btn-sm" style={{ fontSize: 10, background: '#1a1a1a', color: '#fff', border: 'none' }} onClick={() => handlePrintLabel(o)}>Label</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <SlipModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={(inv: string, action: 'approve' | 'reject') => {
            if (action === 'approve') moveOrder(selectedOrder, 'approved')
            else moveOrder(selectedOrder, 'rejected')
            setSelectedOrder(null)
          }}
        />
      )}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  )
}
