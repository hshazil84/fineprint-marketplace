'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import toast from 'react-hot-toast'
import Header from '@/app/components/Header'
import { SlipModal } from '@/app/admin/components/SlipModal'
import { PayoutModal } from '@/app/admin/components/PayoutModal'
import { RemittanceModal } from '@/app/admin/components/RemittanceModal'
import { InvoiceModal } from '@/app/admin/components/InvoiceModal'
import { CustomersTab } from '@/app/admin/components/CustomersTab'

const TABS = ['orders', 'artists', 'listings', 'offers', 'customers', 'export']
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

function AdminExportTab({ artists, onExport, orders }: any) {
  const today     = new Date().toISOString().split('T')[0]
  const yearStart = new Date().getFullYear() + '-01-01'
  const [from, setFrom]     = useState(yearStart)
  const [to, setTo]         = useState(today)
  const [artist, setArtist] = useState('all')

  function applyMonth(val: string) {
    if (!val) return
    const parts = val.split('-')
    const y = parts[0], m = parts[1]
    const last = new Date(parseInt(y), parseInt(m), 0).getDate()
    setFrom(val + '-01')
    setTo(val + '-' + String(last).padStart(2, '0'))
  }

  const filtered = orders.filter((o: any) => {
    const inRange = o.created_at >= from && o.created_at <= to + 'T23:59:59' && o.status === 'approved'
    if (artist === 'all') return inRange
    return inRange && o.artworks?.profiles?.artist_code === artist
  })

  const gross = filtered.reduce((s: number, o: any) => s + o.original_price, 0)
  const comm  = filtered.reduce((s: number, o: any) => s + o.fp_commission, 0)

  const months: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      value: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    })
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Export sales report</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Filter by artist and date range, then download the full CSV.</p>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[['Orders', filtered.length], ['Gross', 'MVR ' + gross.toLocaleString()], ['Commission', 'MVR ' + comm.toLocaleString()]].map(([l, v]) => (
          <div key={l as string} className="stat-card">
            <p className="stat-label">{l}</p>
            <p className="stat-value" style={{ fontSize: 16 }}>{v}</p>
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="form-label">Artist</label>
          <select className="form-input" value={artist} onChange={e => setArtist(e.target.value)}>
            <option value="all">All artists</option>
            {artists.map((a: any) => (
              <option key={a.id} value={a.artist_code}>FP-{a.artist_code} — {a.display_name || a.full_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quick select month</label>
          <select className="form-input" onChange={e => applyMonth(e.target.value)} defaultValue="">
            <option value="">— pick a month —</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onExport(from, to, artist)}>Download CSV</button>
    </div>
  )
}

function AdminDashboard() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab]                       = useState(searchParams.get('tab') || 'orders')
  const [orders, setOrders]                 = useState<any[]>([])
  const [artists, setArtists]               = useState<any[]>([])
  const [artworks, setArtworks]             = useState<any[]>([])
  const [payouts, setPayouts]               = useState<any[]>([])
  const [waitlistCounts, setWaitlistCounts] = useState<Record<number, number>>({})
  const [loading, setLoading]               = useState(true)
  const [selectedOrder, setSelectedOrder]   = useState<any>(null)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [invoiceOrder, setInvoiceOrder]     = useState<any>(null)
  const [remittancePayout, setRemittancePayout] = useState<any>(null)
  const [notifyingId, setNotifyingId]       = useState<number | null>(null)
  const [orderSearch, setOrderSearch]       = useState('')
  const [orderStatus, setOrderStatus]       = useState('all')
  const [listingSearch, setListingSearch]   = useState('')
  const [listingStatus, setListingStatus]   = useState('all')
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || prof.role !== 'admin') { router.push('/storefront'); return }
    await Promise.all([fetchOrders(), fetchArtists(), fetchArtworks(), fetchPayouts(), fetchWaitlistCounts()])
    setLoading(false)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks(title, sku, artist_id, profiles:artist_id(full_name, display_name)), order_items(print_size, artwork_id)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchArtists() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
    setArtists(data || [])
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name, display_name)')
      .order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchPayouts() {
    const { data } = await supabase
      .from('payouts')
      .select('*, profiles:artist_id(full_name, display_name, artist_code, email)')
      .order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function fetchWaitlistCounts() {
    const { data } = await supabase.from('waitlist').select('artwork_id').is('notified_at', null)
    if (data) {
      const counts: Record<number, number> = {}
      data.forEach((w: any) => { counts[w.artwork_id] = (counts[w.artwork_id] || 0) + 1 })
      setWaitlistCounts(counts)
    }
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
    } else {
      toast.error(data.error)
    }
  }

  async function handleArtworkAction(id: number, status: 'approved' | 'rejected') {
    await supabase.from('artworks').update({ status }).eq('id', id)
    toast.success('Artwork ' + status)
    fetchArtworks()
  }

  async function handleWithdrawalAction(artistId: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/admin/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId, action }),
    })
    const data = await res.json()
    if (data.ok) {
      toast.success(action === 'approve' ? 'Artist withdrawn' : 'Withdrawal rejected')
      fetchArtists()
    } else {
      toast.error(data.error || 'Something went wrong')
    }
  }

  async function downloadHires(hiresPath: string) {
    const { data } = await supabase.storage.from('artwork-hires').createSignedUrl(hiresPath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not generate download link')
  }

  async function handleExport(from: string, to: string, artist: string) {
    const res  = await fetch('/api/export?type=admin&from=' + from + '&to=' + to + '&artist=' + artist)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, 'fineprint_sales_' + artist))
    toast.success('CSV downloaded!')
  }

  async function handleNotifyWaitlist(artworkId: number, artworkTitle: string) {
    setNotifyingId(artworkId)
    try {
      const res  = await fetch('/api/waitlist/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Notified ' + data.count + ' people on the waitlist for ' + artworkTitle)
      fetchWaitlistCounts()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNotifyingId(null)
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

      const sizes    = Object.keys(sizeCounts)
      const hasLarge = sizes.some(s => s === 'A2' || s === '12x16')
      const hasSmall = sizes.some(s => s === 'A4' || s === 'A3')
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

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>

  const pendingOrders    = orders.filter(o => o.status === 'pending')
  const pendingPayouts   = payouts.filter(p => p.status === 'pending')
  const paidPayouts      = payouts.filter(p => p.status === 'paid')
  const withdrawRequests = artists.filter(a => a.account_status === 'pending_withdrawal')
  const closedShops      = artists.filter(a => a.shop_status === 'closed')
  const aprRevenue       = orders.filter(o => o.status === 'approved').reduce((s: number, o: any) => s + o.original_price, 0)
  const aprComm          = orders.filter(o => o.status === 'approved').reduce((s: number, o: any) => s + o.fp_commission, 0)
  const totalWaiting     = Object.values(waitlistCounts).reduce((s, c) => s + c, 0)

  const filteredOrders = orders.filter(o => {
    const matchSearch = !orderSearch ||
      o.invoice_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.artworks?.title?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.order_sku?.toLowerCase().includes(orderSearch.toLowerCase())
    const matchStatus = orderStatus === 'all' || o.status === orderStatus
    return matchSearch && matchStatus
  })

  const filteredArtworks = artworks.filter(a => {
    const matchSearch = !listingSearch ||
      a.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.sku?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.profiles?.full_name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.profiles?.display_name?.toLowerCase().includes(listingSearch.toLowerCase())
    const matchStatus = listingStatus === 'all' || a.status === listingStatus
    return matchSearch && matchStatus
  })

return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header
        minimal={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, background: 'var(--color-red-light)', color: '#A32D2D', padding: '3px 10px', borderRadius: 20 }}>Admin</span>
            <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>Log out</button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 24 }}>Admin dashboard</h1>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            ['Pending orders',   pendingOrders.length],
            ['Total orders',     orders.length],
            ['Gross revenue',    formatMVR(aprRevenue)],
            ['Total commission', formatMVR(aprComm)],
          ].map(([label, value]) => (
            <div key={label as string} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          ))}
        </div>

        {withdrawRequests.length > 0 && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#A32D2D' }}>
            {withdrawRequests.length} artist{withdrawRequests.length > 1 ? 's have' : ' has'} requested to withdraw. Check the Artists tab.
          </div>
        )}
        {closedShops.length > 0 && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#633806' }}>
            {closedShops.length} artist{closedShops.length > 1 ? 's have' : ' has'} temporarily closed their shop.
          </div>
        )}
        {totalWaiting > 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#0F6E56' }}>
            {totalWaiting} buyer{totalWaiting !== 1 ? 's' : ''} waiting on sold-out artworks. Check the Listings tab to notify them.
          </div>
        )}

        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'orders' && pendingOrders.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-red)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingOrders.length}</span>
              )}
              {t === 'artists' && pendingPayouts.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingPayouts.length}</span>
              )}
              {t === 'listings' && totalWaiting > 0 && (
                <span style={{ marginLeft: 6, background: '#1D9E75', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{totalWaiting}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <OrdersTab
            orders={filteredOrders}
            allOrders={orders}
            orderSearch={orderSearch}
            setOrderSearch={setOrderSearch}
            orderStatus={orderStatus}
            setOrderStatus={setOrderStatus}
            onAction={handleOrderAction}
            onStatusChange={fetchOrders}
            onViewInvoice={setInvoiceOrder}
            onViewSlip={setSelectedOrder}
            onPrintLabel={handlePrintLabel}
          />
        )}

        {tab === 'artists' && (
          <div>
            {pendingPayouts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  Pending payout requests
                  <span style={{ marginLeft: 8, background: 'var(--color-teal)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{pendingPayouts.length}</span>
                </p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {pendingPayouts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>
                          {p.profiles?.display_name || p.profiles?.full_name}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.account_number}</span>
                          <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { navigator.clipboard.writeText(p.account_number); toast.success('Copied!') }}>Copy</button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Requested {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{formatMVR(p.amount)}</p>
                        <button className="btn btn-sm btn-success" onClick={() => setSelectedPayout(p)}>Pay and confirm</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {withdrawRequests.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#A32D2D' }}>Withdrawal requests</p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {withdrawRequests.map(a => (
                    <div key={a.id} style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#FCEBEB' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>
                            {a.display_name || a.full_name}
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#A32D2D', marginLeft: 8 }}>FP-{a.artist_code}</span>
                          </p>
                          <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 4 }}>Reason: {a.withdraw_reason || 'No reason provided'}</p>
                          <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>{a.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ fontSize: 11 }}
                            onClick={() => handleWithdrawalAction(a.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => handleWithdrawalAction(a.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
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
                        <p style={{ fontSize: 14, fontWeight: 500 }}>
                          {p.profiles?.display_name || p.profiles?.full_name}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.paid_at ? 'Paid ' + new Date(p.paid_at).toLocaleDateString() : ''}</p>
                        <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => setRemittancePayout(p)}>View remittance</button>
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
                const artistOrders     = orders.filter(o => o.artworks?.artist_id === a.id && o.status === 'approved')
                const artistPayoutsArr = payouts.filter(p => p.artist_id === a.id && p.status === 'paid')
                const totalEarned      = artistOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
                const totalPaid        = artistPayoutsArr.reduce((s: number, p: any) => s + p.amount, 0)
                const artworkCount     = artworks.filter(w => w.artist_id === a.id).length
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{a.display_name || a.full_name}</p>
                        {a.shop_status === 'closed' && (
                          <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>Shop closed</span>
                        )}
                        {a.account_status === 'pending_withdrawal' && (
                          <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 7px', borderRadius: 20 }}>Withdrawal requested</span>
                        )}
                        {a.account_status === 'withdrawn' && (
                          <span style={{ fontSize: 10, background: '#1a1a1a', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>Withdrawn</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        FP-{a.artist_code} · {a.email} · {artworkCount} listings · {artistOrders.length} sales
                      </p>
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

        {tab === 'listings' && (
          <ListingsTab
            artworks={filteredArtworks}
            allArtworks={artworks}
            listingSearch={listingSearch}
            setListingSearch={setListingSearch}
            listingStatus={listingStatus}
            setListingStatus={setListingStatus}
            waitlistCounts={waitlistCounts}
            notifyingId={notifyingId}
            onArtworkAction={handleArtworkAction}
            onDownloadHires={downloadHires}
            onNotifyWaitlist={handleNotifyWaitlist}
          />
        )}

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
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.profiles?.display_name || a.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {a.sku} · {a.offer_pct}% off{a.offer_expires ? ' · Expires ' + a.offer_expires : ' · No expiry'}
                  </p>
                </div>
                <span className="badge" style={{ background: 'var(--color-red-light)', color: '#A32D2D' }}>Active</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'customers' && <CustomersTab />}
        {tab === 'export'    && <AdminExportTab artists={artists} onExport={handleExport} orders={orders} />}
      </div>

      {selectedOrder    && <SlipModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onAction={(inv, action) => { handleOrderAction(inv, action); setSelectedOrder(null) }} />}
      {selectedPayout   && <PayoutModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onPaid={() => { fetchPayouts(); fetchOrders() }} />}
      {invoiceOrder     && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {remittancePayout && <RemittanceModal payout={remittancePayout} onClose={() => setRemittancePayout(null)} />}
    </div>
  )
}
return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header
        minimal={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, background: 'var(--color-red-light)', color: '#A32D2D', padding: '3px 10px', borderRadius: 20 }}>Admin</span>
            <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>Log out</button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 24 }}>Admin dashboard</h1>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            ['Pending orders',   pendingOrders.length],
            ['Total orders',     orders.length],
            ['Gross revenue',    formatMVR(aprRevenue)],
            ['Total commission', formatMVR(aprComm)],
          ].map(([label, value]) => (
            <div key={label as string} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          ))}
        </div>

        {withdrawRequests.length > 0 && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#A32D2D' }}>
            {withdrawRequests.length} artist{withdrawRequests.length > 1 ? 's have' : ' has'} requested to withdraw. Check the Artists tab.
          </div>
        )}
        {closedShops.length > 0 && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#633806' }}>
            {closedShops.length} artist{closedShops.length > 1 ? 's have' : ' has'} temporarily closed their shop.
          </div>
        )}
        {totalWaiting > 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#0F6E56' }}>
            {totalWaiting} buyer{totalWaiting !== 1 ? 's' : ''} waiting on sold-out artworks. Check the Listings tab to notify them.
          </div>
        )}

        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'orders' && pendingOrders.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-red)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingOrders.length}</span>
              )}
              {t === 'artists' && pendingPayouts.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{pendingPayouts.length}</span>
              )}
              {t === 'listings' && totalWaiting > 0 && (
                <span style={{ marginLeft: 6, background: '#1D9E75', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>{totalWaiting}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <OrdersTab
            orders={filteredOrders}
            allOrders={orders}
            orderSearch={orderSearch}
            setOrderSearch={setOrderSearch}
            orderStatus={orderStatus}
            setOrderStatus={setOrderStatus}
            onAction={handleOrderAction}
            onStatusChange={fetchOrders}
            onViewInvoice={setInvoiceOrder}
            onViewSlip={setSelectedOrder}
            onPrintLabel={handlePrintLabel}
          />
        )}

        {tab === 'artists' && (
          <div>
            {pendingPayouts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  Pending payout requests
                  <span style={{ marginLeft: 8, background: 'var(--color-teal)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{pendingPayouts.length}</span>
                </p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {pendingPayouts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>
                          {p.profiles?.display_name || p.profiles?.full_name}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.account_number}</span>
                          <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { navigator.clipboard.writeText(p.account_number); toast.success('Copied!') }}>Copy</button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Requested {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{formatMVR(p.amount)}</p>
                        <button className="btn btn-sm btn-success" onClick={() => setSelectedPayout(p)}>Pay and confirm</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {withdrawRequests.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#A32D2D' }}>Withdrawal requests</p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {withdrawRequests.map(a => (
                    <div key={a.id} style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#FCEBEB' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>
                            {a.display_name || a.full_name}
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#A32D2D', marginLeft: 8 }}>FP-{a.artist_code}</span>
                          </p>
                          <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 4 }}>Reason: {a.withdraw_reason || 'No reason provided'}</p>
                          <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>{a.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ fontSize: 11 }}
                            onClick={() => handleWithdrawalAction(a.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => handleWithdrawalAction(a.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
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
                        <p style={{ fontSize: 14, fontWeight: 500 }}>
                          {p.profiles?.display_name || p.profiles?.full_name}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.paid_at ? 'Paid ' + new Date(p.paid_at).toLocaleDateString() : ''}</p>
                        <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => setRemittancePayout(p)}>View remittance</button>
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
                const artistOrders     = orders.filter(o => o.artworks?.artist_id === a.id && o.status === 'approved')
                const artistPayoutsArr = payouts.filter(p => p.artist_id === a.id && p.status === 'paid')
                const totalEarned      = artistOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
                const totalPaid        = artistPayoutsArr.reduce((s: number, p: any) => s + p.amount, 0)
                const artworkCount     = artworks.filter(w => w.artist_id === a.id).length
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{a.display_name || a.full_name}</p>
                        {a.shop_status === 'closed' && (
                          <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>Shop closed</span>
                        )}
                        {a.account_status === 'pending_withdrawal' && (
                          <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 7px', borderRadius: 20 }}>Withdrawal requested</span>
                        )}
                        {a.account_status === 'withdrawn' && (
                          <span style={{ fontSize: 10, background: '#1a1a1a', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>Withdrawn</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        FP-{a.artist_code} · {a.email} · {artworkCount} listings · {artistOrders.length} sales
                      </p>
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

        {tab === 'listings' && (
          <ListingsTab
            artworks={filteredArtworks}
            allArtworks={artworks}
            listingSearch={listingSearch}
            setListingSearch={setListingSearch}
            listingStatus={listingStatus}
            setListingStatus={setListingStatus}
            waitlistCounts={waitlistCounts}
            notifyingId={notifyingId}
            onArtworkAction={handleArtworkAction}
            onDownloadHires={downloadHires}
            onNotifyWaitlist={handleNotifyWaitlist}
          />
        )}

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
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.profiles?.display_name || a.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {a.sku} · {a.offer_pct}% off{a.offer_expires ? ' · Expires ' + a.offer_expires : ' · No expiry'}
                  </p>
                </div>
                <span className="badge" style={{ background: 'var(--color-red-light)', color: '#A32D2D' }}>Active</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'customers' && <CustomersTab />}
        {tab === 'export'    && <AdminExportTab artists={artists} onExport={handleExport} orders={orders} />}
      </div>

      {selectedOrder    && <SlipModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onAction={(inv, action) => { handleOrderAction(inv, action); setSelectedOrder(null) }} />}
      {selectedPayout   && <PayoutModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onPaid={() => { fetchPayouts(); fetchOrders() }} />}
      {invoiceOrder     && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {remittancePayout && <RemittanceModal payout={remittancePayout} onClose={() => setRemittancePayout(null)} />}
    </div>
  )
}

function OrdersTab({ orders, allOrders, orderSearch, setOrderSearch, orderStatus, setOrderStatus, onAction, onStatusChange, onViewInvoice, onViewSlip, onPrintLabel }: any) {
  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(orders, PAGE_SIZES.orders)

  return (
    <div>
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
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {(orderSearch || orderStatus !== 'all') && (
          <button className="btn btn-sm" onClick={() => { setOrderSearch(''); setOrderStatus('all') }}>Clear ×</button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {orders.length === 0 && allOrders.length > 0 ? 'No orders match your search.' : 'No orders yet.'}
          </p>
        ) : paginated.map((o: any) => (
          <OrderRow
            key={o.id}
            order={o}
            onAction={onAction}
            onStatusChange={onStatusChange}
            onViewInvoice={() => onViewInvoice(o)}
            onViewSlip={() => onViewSlip(o)}
            onPrintLabel={onPrintLabel}
          />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />
    </div>
  )
}

function ListingsTab({ artworks, allArtworks, listingSearch, setListingSearch, listingStatus, setListingStatus, waitlistCounts, notifyingId, onArtworkAction, onDownloadHires, onNotifyWaitlist }: any) {
  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(artworks, PAGE_SIZES.listings)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder="Search title, SKU, artist..."
          value={listingSearch}
          onChange={e => setListingSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, fontSize: 13 }}
        />
        <select
          className="form-input"
          value={listingStatus}
          onChange={e => setListingStatus(e.target.value)}
          style={{ fontSize: 13, maxWidth: 150 }}
        >
          <option value="all">All statuses</option>
          {['pending', 'approved', 'rejected', 'hidden'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(listingSearch || listingStatus !== 'all') && (
          <button className="btn btn-sm" onClick={() => { setListingSearch(''); setListingStatus('all') }}>Clear ×</button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {artworks.length === 0 && allArtworks.length > 0 ? 'No listings match your search.' : 'No listings yet.'}
          </p>
        ) : paginated.map((a: any) => {
          const waitCount = waitlistCounts[a.id] || 0
          const remaining = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
          const isSoldOut = remaining === 0
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
              {a.preview_url && (
                <img src={a.preview_url} alt={a.title} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="sku-tag">{a.sku}</span>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                  <span className={'badge badge-' + a.status}>{a.status}</span>
                  {a.edition_size && (
                    <span style={{ fontSize: 10, background: isSoldOut ? '#FCEBEB' : '#f0f0ec', color: isSoldOut ? '#A32D2D' : 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>
                      {isSoldOut ? 'Sold out' : remaining + ' of ' + a.edition_size + ' left'}
                    </span>
                  )}
                  {a.paper_type && a.paper_type !== 'Photo Luster' && (
                    <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>{a.paper_type}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  by {a.profiles?.display_name || a.profiles?.full_name} · {formatMVR(a.price)}
                  {a.offer_label ? ' · ' + a.offer_label + ' ' + a.offer_pct + '% off' : ''}
                </p>
                {waitCount > 0 && (
                  <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 4 }}>{waitCount} buyer{waitCount !== 1 ? 's' : ''} on waitlist</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexDirection: 'column' }}>
                {a.hires_path && <button className="btn btn-sm" onClick={() => onDownloadHires(a.hires_path)}>Hi-res</button>}
                {a.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-success" onClick={() => onArtworkAction(a.id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onArtworkAction(a.id, 'rejected')}>Reject</button>
                  </div>
                )}
                {waitCount > 0 && (
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', border: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => onNotifyWaitlist(a.id, a.title)}
                    disabled={notifyingId === a.id}
                  >
                    {notifyingId === a.id ? 'Notifying...' : 'Notify ' + waitCount}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />
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
