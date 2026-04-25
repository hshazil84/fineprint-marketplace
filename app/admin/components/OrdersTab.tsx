'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import { SlipModal } from '@/app/admin/components/SlipModal'
import { InvoiceModal } from '@/app/admin/components/InvoiceModal'
import toast from 'react-hot-toast'

const ORDER_STATUSES = ['pending', 'approved', 'printing', 'ready', 'completed', 'rejected']

function OrderRow({ order, onAction, onStatusChange, onViewInvoice, onViewSlip, onPrintLabel }: any) {
  const [updating, setUpdating]   = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const artistDisplay = order.artworks?.profiles?.display_name || order.artworks?.profiles?.full_name

  async function updateStatus(newStatus: string) {
    if (newStatus === order.status) return
    setUpdating(true)
    const shouldSendEmail = sendEmail && newStatus === 'ready'
    const res  = await fetch('/api/orders/status', {
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
            <span className={'badge badge-' + order.status}>{order.status}</span>
            {order.payment_method === 'swipe' && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#6A0AF2', color: '#fff', whiteSpace: 'nowrap' }}>
                Swipe
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{order.artworks?.title} by {artistDisplay}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {order.buyer_name} · {new Date(order.created_at).toLocaleDateString()} · {formatMVR(order.total_paid)}
            {' · '}{order.delivery_method === 'pickup' ? 'Pickup' : 'Deliver to ' + order.delivery_island}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
          Notify buyer
        </label>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {order.slip_url && (
            <button
              className="btn btn-sm"
              style={{ fontSize: 11, padding: '3px 10px', background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', border: 'none' }}
              onClick={onViewSlip}
            >
              Slip
            </button>
          )}
          {order.status !== 'pending' && order.status !== 'rejected' && (
            <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onViewInvoice}>
              Invoice
            </button>
          )}
          {order.status === 'approved' && (
            <button
              className="btn btn-sm"
              style={{ fontSize: 11, padding: '3px 10px', background: '#1a1a1a', color: '#fff', border: 'none' }}
              onClick={() => onPrintLabel(order)}
            >
              Label
            </button>
          )}
          {order.status === 'pending' && (order.payment_method === 'swipe' || !order.slip_url) && (
            <>
              <button className="btn btn-sm btn-success" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'approve')}>Approve</button>
              <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => onAction(order.invoice_number, 'reject')}>Reject</button>
            </>
          )}
        </div>
      </div>
      {order.status === 'ready' && order.delivery_method === 'pickup' && (
        <p style={{ fontSize: 11, color: 'var(--color-teal-dark)', marginTop: 8, background: 'var(--color-teal-light)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
          Pickup email tells buyer to call 9998124 to arrange collection
        </p>
      )}
      {order.status === 'ready' && order.delivery_method === 'delivery' && (
        <p style={{ fontSize: 11, color: 'var(--color-teal-dark)', marginTop: 8, background: 'var(--color-teal-light)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
          Delivery email tells buyer to expect a call from 9998124
        </p>
      )}
    </div>
  )
}

export function OrdersTab({ onBadgeRefresh }: { onBadgeRefresh: () => void }) {
  const [orders, setOrders]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [invoiceOrder, setInvoiceOrder]   = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks(title, sku, artist_id, profiles:artist_id(full_name, display_name)), order_items(print_size, artwork_id)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function handleOrderAction(invoiceNumber: string, action: 'approve' | 'reject') {
    const res  = await fetch('/api/orders/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber, action }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(action === 'approve' ? 'Order approved — invoice sent!' : 'Order rejected')
      fetchOrders()
      onBadgeRefresh()
    } else {
      toast.error(data.error)
    }
  }

  async function handlePrintLabel(order: any) {
    try {
      const { printLabel } = await import('@/lib/label')
      const items = order.order_items && order.order_items.length > 0
        ? order.order_items
        : [{ print_size: order.print_size || 'A4' }]

      const sizeCounts: Record<string, number> = {}
      items.forEach((item: any) => {
        const size = item.print_size || 'A4'
        sizeCounts[size] = (sizeCounts[size] || 0) + 1
      })

      const sizes     = Object.keys(sizeCounts)
      const hasLarge  = sizes.some(s => s === 'A2' || s === '12x16')
      const hasSmall  = sizes.some(s => s === 'A4' || s === 'A3')
      const packaging = hasLarge && hasSmall
        ? 'Flat mailer + Tube'
        : hasLarge ? 'Tube' : 'Flat mailer'

      printLabel({
        invoiceNumber:  order.invoice_number,
        orderSku:       order.order_sku,
        buyerName:      order.buyer_name,
        buyerPhone:     order.buyer_phone || '',
        deliveryIsland: order.delivery_island || '',
        deliveryAtoll:  order.delivery_atoll  || '',
        deliveryMethod: order.delivery_method,
        sizeCounts,
        packaging,
        approvedAt:     order.approved_at || order.created_at,
      })
    } catch (err: any) {
      toast.error('Could not generate label: ' + err.message)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = !orderSearch ||
      o.invoice_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.artworks?.title?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.order_sku?.toLowerCase().includes(orderSearch.toLowerCase())
    const matchStatus = orderStatus === 'all' || o.status === orderStatus
    return matchSearch && matchStatus
  })

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filteredOrders, PAGE_SIZES.orders)

  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading orders...</div>

  return (
    <div>
      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Pending',   orders.filter(o => o.status === 'pending').length],
          ['Approved',  orders.filter(o => o.status === 'approved').length],
          ['Completed', orders.filter(o => o.status === 'completed').length],
          ['Total',     orders.length],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder="Search invoice, buyer, artwork..."
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, fontSize: 13 }}
        />
        <select
          className="form-input"
          value={orderStatus}
          onChange={e => setOrderStatus(e.target.value)}
          style={{ fontSize: 13, maxWidth: 150 }}
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(orderSearch || orderStatus !== 'all') && (
          <button className="btn btn-sm" onClick={() => { setOrderSearch(''); setOrderStatus('all') }}>Clear ×</button>
        )}
      </div>

      {/* Orders list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {filteredOrders.length === 0 && orders.length > 0 ? 'No orders match your search.' : 'No orders yet.'}
          </p>
        ) : paginated.map((o: any) => (
          <OrderRow
            key={o.id}
            order={o}
            onAction={handleOrderAction}
            onStatusChange={fetchOrders}
            onViewInvoice={() => setInvoiceOrder(o)}
            onViewSlip={() => setSelectedOrder(o)}
            onPrintLabel={handlePrintLabel}
          />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        startIndex={startIndex}
        endIndex={endIndex}
        onPage={setPage}
      />

      {selectedOrder && (
        <SlipModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={(inv, action) => { handleOrderAction(inv, action); setSelectedOrder(null) }}
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
