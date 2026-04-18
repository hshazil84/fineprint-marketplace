'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Link from 'next/link'

const TABS = ['orders', 'artists', 'listings', 'offers', 'export']

function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'orders')
  const [orders, setOrders] = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [artworks, setArtworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || prof.role !== 'admin') { router.push('/storefront'); return }
    await Promise.all([fetchOrders(), fetchArtists(), fetchArtworks()])
    setLoading(false)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks(title, sku, artist_id, profiles:artist_id(full_name))')
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchArtists() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'artist').order('created_at', { ascending: false })
    setArtists(data || [])
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name)')
      .order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function handleOrderAction(invoiceNumber: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/orders/approve', {
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
    toast.success(`Artwork ${status}`)
    fetchArtworks()
  }

  async function handleExport(from: string, to: string, artist: string) {
    const res = await fetch(`/api/export?type=admin&from=${from}&to=${to}&artist=${artist}`)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, `fineprint_sales_${artist}`))
    toast.success('CSV downloaded!')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>

  const pendingOrders = orders.filter(o => o.status === 'pending')
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
          {[
            ['Pending orders', pendingOrders.length],
            ['Total orders', orders.length],
            ['Gross revenue', formatMVR(aprRevenue)],
            ['Total commission', formatMVR(aprComm)],
          ].map(([label, value]) => (
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
              {t === 'orders' && pendingOrders.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-red)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {orders.length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders yet.</p>
            ) : orders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{o.invoice_number}</p>
                    <span className="sku-tag">{o.order_sku}</span>
                    <span className={`badge badge-${o.status}`}>{o.status}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {o.artworks?.title} by {o.artworks?.profiles?.full_name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()} · {formatMVR(o.total_paid)}
                    {o.offer_label ? ` · ${o.offer_label} −${o.offer_pct}%` : ''}
                    {' · '}{o.delivery_method === 'pickup' ? 'Pickup' : `Deliver → ${o.delivery_island}`}
                  </p>
                  {o.slip_url && <p style={{ fontSize: 12, color: 'var(--color-teal)', marginTop: 2 }}>✓ Slip uploaded</p>}
                </div>
                {o.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleOrderAction(o.invoice_number, 'approve')}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleOrderAction(o.invoice_number, 'reject')}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'artists' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {artists.map(a => {
              const artistOrders = orders.filter(o => o.artworks?.artist_id === a.id && o.status === 'approved')
              const pending = artistOrders.filter(o => o.payout_status === 'unpaid').reduce((s: number, o: any) => s + o.artist_earnings, 0)
              const artworkCount = artworks.filter(w => w.artist_id === a.id).length
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{a.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      FP-{a.artist_code} · {a.email} · {artworkCount} listings · {artistOrders.length} sales
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(pending)} pending</p>
                    <span className="badge badge-approved" style={{ marginTop: 4, display: 'inline-block' }}>Active</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'listings' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {artworks.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="sku-tag">{a.sku}</span>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    by {a.profiles?.full_name} · {formatMVR(a.price)}
                    {a.offer_label ? ` · ${a.offer_label} −${a.offer_pct}%` : ''}
                  </p>
                </div>
                {a.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleArtworkAction(a.id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleArtworkAction(a.id, 'rejected')}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'offers' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Your commission is always based on the original price regardless of artist discounts.</p>
            </div>
            {artworks.filter(a => a.offer_pct).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {a.sku} · {a.offer_pct}% off{a.offer_expires ? ` · Expires ${a.offer_expires}` : ' · No expiry'}
                  </p>
                </div>
                <span className="badge" style={{ background: 'var(--color-red-light)', color: '#A32D2D' }}>Active</span>
              </div>
            ))}
            {artworks.filter(a => a.offer_pct).length === 0 && (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No active offers.</p>
            )}
          </div>
        )}

        {tab === 'export' && <AdminExportTab artists={artists} onExport={handleExport} orders={orders} />}
      </div>
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
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' })
    })
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
        <div className="form-group">
          <label className="form-label">Artist</label>
          <select className="form-input" value={artist} onChange={e => setArtist(e.target.value)}>
            <option value="all">All artists</option>
            {artists.map((a: any) => (
              <option key={a.id} value={a.artist_code}>FP-{a.artist_code} — {a.full_name}</option>
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
