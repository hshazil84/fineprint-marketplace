'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SIZES = ['A4', 'A3', 'A2', '12×16"']
const TABS = ['listings', 'offers', 'upload', 'orders', 'export', 'profile']

export default function ArtistDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState('listings')
  const [profile, setProfile] = useState<any>(null)
  const [artworks, setArtworks] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || prof.role !== 'artist') { router.push('/storefront'); return }
    setProfile(prof)
    await Promise.all([fetchArtworks(user.id), fetchOrders(user.id)])
    setLoading(false)
  }

  async function fetchArtworks(artistId: string) {
    const { data } = await supabase.from('artworks').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchOrders(artistId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, artworks!inner(title, sku, artist_id)')
      .eq('artworks.artist_id', artistId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function handleExport(from: string, to: string) {
    const res = await fetch(`/api/export?type=artist&from=${from}&to=${to}`)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, `fineprint_my_sales`))
    toast.success('CSV downloaded!')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>

  const totalEarnings = orders.filter(o => o.status === 'approved').reduce((s: number, o: any) => s + o.artist_earnings, 0)
  const pendingEarnings = orders.filter(o => o.status === 'approved' && o.payout_status === 'unpaid').reduce((s: number, o: any) => s + o.artist_earnings, 0)

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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>Artist dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
          <span className="sku-tag">{profile?.artist_code ? `FP-${profile.artist_code}` : ''}</span>
        </p>

        <div className="protection-banner">
          <span>🔒</span>
          <span>Your artwork is protected — buyers only see low-resolution watermarked previews. High-res files are stored privately for print fulfillment only.</span>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            ['Total listings', artworks.length],
            ['Orders received', orders.length],
            ['Pending payout', formatMVR(pendingEarnings)],
            ['Total earned', formatMVR(totalEarnings)],
          ].map(([label, value]) => (
            <div key={label as string} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Listings tab */}
        {tab === 'listings' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {artworks.length === 0 ? (
              <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No listings yet. Upload your first artwork!</p>
            ) : artworks.map(a => {
              const p = calculatePrices(a.price, a.offer_pct || 0, a.offer_label)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="sku-tag">{a.sku}</span>
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                      {a.offer_label && <span className="offer-tag">{a.offer_label} −{a.offer_pct}%</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(p.artistEarnings)}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>your cut</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Offers tab */}
        {tab === 'offers' && <OffersTab artworks={artworks} onRefresh={() => init()} />}

        {/* Upload tab */}
        {tab === 'upload' && <UploadTab profile={profile} nextSeq={artworks.length + 1} onSuccess={() => { setTab('listings'); init() }} />}

        {/* Orders tab */}
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
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                  <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{formatMVR(o.artist_earnings)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export tab */}
        {tab === 'export' && <ExportTab onExport={handleExport} orders={orders} />}

        {/* Profile tab */}
        {tab === 'profile' && <ProfileTab profile={profile} onSave={(updated: any) => setProfile({ ...profile, ...updated })} />}
      </div>
    </div>
  )
}

// ── OFFERS TAB ───────────────────────────────
function OffersTab({ artworks, onRefresh }: any) {
  const [label, setLabel] = useState('Eid Special')
  const [pct, setPct] = useState(15)
  const [target, setTarget] = useState('all')
  const supabase = createClient()
  const COMMISSION = 25

  const previewPrice = artworks[0]?.price || 450
  const discount = Math.round(previewPrice * pct / 100)
  const buyerPays = previewPrice - discount
  const commission = Math.round(previewPrice * COMMISSION / 100)
  const artistEarns = buyerPays - commission

  async function activate() {
    const updates = target === 'all'
      ? artworks.map((a: any) => a.id)
      : [parseInt(target)]
    for (const id of updates) {
      await supabase.from('artworks').update({ offer_label: label, offer_pct: pct }).eq('id', id)
    }
    toast.success('Offer activated!')
    onRefresh()
  }

  async function removeOffer(id: number) {
    await supabase.from('artworks').update({ offer_label: null, offer_pct: null }).eq('id', id)
    toast.success('Offer removed')
    onRefresh()
  }

  const activeOffers = artworks.filter((a: any) => a.offer_pct)

  return (
    <div>
      <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Create an offer</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Discounts come entirely out of your share. FinePrint Studio's 25% is always based on the original price.</p>
        <div className="form-group">
          <label className="form-label">Apply to</label>
          <select className="form-input" value={target} onChange={e => setTarget(e.target.value)}>
            <option value="all">All my artworks</option>
            {artworks.map((a: any) => <option key={a.id} value={a.id}>{a.sku} — {a.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Offer label</label>
          <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Eid Special" />
        </div>
        <div className="form-group">
          <label className="form-label">Discount: {pct}%</label>
          <input type="range" min={5} max={50} step={5} value={pct} onChange={e => setPct(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-md)', padding: 14, marginTop: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Payout preview — per sale at {formatMVR(previewPrice)}</p>
          {[
            ['Original price', formatMVR(previewPrice), ''],
            [`Discount (${pct}%)`, `− ${formatMVR(discount)}`, 'var(--color-red)'],
            ['Buyer pays', formatMVR(buyerPays), ''],
            ['FinePrint commission (25% of original)', formatMVR(commission), 'var(--color-text-muted)'],
            ['Your earnings', formatMVR(artistEarns), 'var(--color-teal)'],
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
            const p = calculatePrices(a.price, a.offer_pct, a.offer_label)
            return (
              <div key={a.id} style={{ border: '0.5px solid var(--color-red)', background: 'var(--color-red-light)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.offer_pct}% off</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {a.sku} · Buyer pays {formatMVR(p.printPrice)} · You earn {formatMVR(p.artistEarnings)}
                  </p>
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

// ── UPLOAD TAB ───────────────────────────────
function UploadTab({ profile, nextSeq, onSuccess }: any) {
  const [form, setForm] = useState({ title: '', description: '', price: '', sizes: ['A4', 'A3'] })
  const [hiresFile, setHiresFile] = useState<File | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const nextSku = `FP-${profile?.artist_code}-${String(nextSeq).padStart(3, '0')}`

  function toggleSize(size: string) {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size]
    }))
  }

  async function handleUpload() {
    if (!form.title || !form.price) { toast.error('Please fill in title and price'); return }
    if (!hiresFile) { toast.error('Please upload your high-res artwork file'); return }
    setUploading(true)
    try {
      const { data: { user } } = await createClient().auth.getUser()
      const fd = new FormData()
      fd.append('artistId', user!.id)
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('price', form.price)
      fd.append('sizes', JSON.stringify(form.sizes))
      fd.append('hires', hiresFile)
      if (previewFile) fd.append('preview', previewFile)
      const res = await fetch('/api/artworks', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Artwork submitted! SKU: ${data.sku}`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Upload new artwork</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Upload your high-res file. Buyers only see a low-res watermarked preview.</p>
      <div className="upload-zone" style={{ marginBottom: 16 }} onClick={() => document.getElementById('hires-input')?.click()}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🖼</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{hiresFile ? hiresFile.name : 'Upload high-res artwork (JPG/PNG)'}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>Min 3000px · stored privately</p>
      </div>
      <input type="file" id="hires-input" accept="image/*" style={{ display: 'none' }} onChange={e => setHiresFile(e.target.files?.[0] || null)} />
      <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Name your artwork" /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell buyers about this piece..." /></div>
      <div className="form-group"><label className="form-label">Price (MVR)</label><input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 450" /></div>
      <div className="form-group">
        <label className="form-label">Print sizes</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {SIZES.map(s => (
            <label key={s} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>{nextSku} ← next available</p>
      </div>
      <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>
    </div>
  )
}

// ── EXPORT TAB ───────────────────────────────
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

// ── PROFILE TAB ──────────────────────────────
function ProfileTab({ profile, onSave }: any) {
  const [form, setForm] = useState({ bio: profile.bio || '', location: profile.location || '', instagram: profile.instagram || '', website: profile.website || '' })
  const supabase = createClient()

  async function save() {
    await supabase.from('profiles').update(form).eq('id', profile.id)
    onSave(form)
    toast.success('Profile saved!')
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Your public profile</p>
      <div className="form-group"><label className="form-label">Bio</label><textarea className="form-input" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell buyers about yourself and your art..." /></div>
      <div className="form-group"><label className="form-label">Island / Location</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Malé, Kaafu Atoll" /></div>
      <div className="form-group"><label className="form-label">Instagram</label><input className="form-input" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@yourusername" /></div>
      <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yoursite.com" /></div>
      <button className="btn btn-primary btn-full" onClick={save}>Save profile</button>
    </div>
  )
}
