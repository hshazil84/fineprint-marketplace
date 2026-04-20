'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'
import Header from '@/app/components/Header'
import { InvoiceModal } from '@/app/artist/components/InvoiceModal'
import { RemittanceModal } from '@/app/artist/components/RemittanceModal'
import { OffersTab } from '@/app/artist/components/OffersTab'
import { PayoutsTab } from '@/app/artist/components/PayoutsTab'
import { ExportTab } from '@/app/artist/components/ExportTab'
import { ProfileTab } from '@/app/artist/components/ProfileTab'
import { UploadTab } from '@/app/artist/components/UploadTab'
import { SettingsTab } from '@/app/artist/components/SettingsTab'

const PLATFORM_FEE = 5
const TABS = ['listings', 'offers', 'upload', 'orders', 'payouts', 'export', 'profile', 'settings']

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
  const [editingArtwork, setEditingArtwork] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
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
    const res = await fetch('/api/export?type=artist&from=' + from + '&to=' + to)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, 'fineprint_my_sales'))
    toast.success('CSV downloaded!')
  }

  async function toggleHide(artwork: any) {
    const newStatus = artwork.status === 'hidden' ? 'approved' : 'hidden'
    await supabase.from('artworks').update({ status: newStatus }).eq('id', artwork.id)
    toast.success(newStatus === 'hidden' ? 'Listing hidden from storefront' : 'Listing visible on storefront')
    if (profile) fetchArtworks(profile.id)
  }

  async function deleteArtwork(id: number) {
    await supabase.from('artworks').delete().eq('id', id)
    toast.success('Listing deleted')
    setDeleteConfirmId(null)
    if (profile) fetchArtworks(profile.id)
  }

  async function saveEdit(id: number, updates: any) {
    await supabase.from('artworks').update(updates).eq('id', id)
    toast.success('Listing updated')
    setEditingArtwork(null)
    if (profile) fetchArtworks(profile.id)
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>
  }

  const approvedOrders = orders.filter(o => o.status === 'approved')
  const totalEarnings = approvedOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
  const paidOut = payouts.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
  const pendingEarnings = totalEarnings - paidOut

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header
        minimal={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {profile?.display_name || profile?.full_name}
            </span>
            <button
              className="btn btn-sm"
              onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            >
              Log out
            </button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 2 }}>Artist dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="sku-tag">{profile?.artist_code ? 'FP-' + profile.artist_code : ''}</span>
            {profile?.shop_status === 'closed' ? (
              <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #EF9F27' }}>
                Shop closed
              </span>
            ) : (
              <span style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #5DCAA5' }}>
                Shop open
              </span>
            )}
          </div>
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
            <div
              key={label as string}
              className="stat-card"
              style={{ cursor: label === 'Pending payout' ? 'pointer' : 'default' }}
              onClick={() => label === 'Pending payout' && setTab('payouts')}
            >
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
              {label === 'Pending payout' && pendingEarnings > 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>Tap to request</p>
              )}
            </div>
          ))}
        </div>

        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
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
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {artworks.length === 0 ? (
                <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No listings yet. Upload your first artwork!</p>
              ) : artworks.map(a => {
                const platformFee = Math.round(a.price * PLATFORM_FEE / 100)
                const artistEarns = a.price - platformFee
                const isEditing = editingArtwork?.id === a.id
                const isDeleting = deleteConfirmId === a.id

                return (
                  <div key={a.id} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                      {a.preview_url && (
                        <img src={a.preview_url} alt={a.title} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0, opacity: a.status === 'hidden' ? 0.4 : 1 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="sku-tag">{a.sku}</span>
                          <span className={'badge badge-' + a.status}>{a.status}</span>
                          {a.category && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.category}</span>}
                          {a.offer_label && <span className="offer-tag">{a.offer_label} {a.offer_pct}% off</span>}
                        </div>
                        {a.painting_by && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Painting by {a.painting_by}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(artistEarns)}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>your earnings</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => setEditingArtwork(isEditing ? null : a)}
                      >
                        {isEditing ? 'Cancel edit' : 'Edit'}
                      </button>
                      {a.status !== 'pending' && (
                        <button
                          className="btn btn-sm"
                          style={{ fontSize: 11, background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'var(--color-background-secondary)', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: 'none' }}
                          onClick={() => toggleHide(a)}
                        >
                          {a.status === 'hidden' ? 'Show listing' : 'Hide listing'}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: 11 }}
                        onClick={() => setDeleteConfirmId(isDeleting ? null : a.id)}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Delete confirmation */}
                    {isDeleting && (
                      <div style={{ padding: '0 20px 14px' }}>
                        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <p style={{ fontSize: 13, color: '#A32D2D' }}>
                            Permanently delete this listing? This cannot be undone.
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => deleteArtwork(a.id)}>Yes, delete</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                      <EditArtworkForm artwork={a} onSave={updates => saveEdit(a.id, updates)} onCancel={() => setEditingArtwork(null)} />
                    )}
                  </div>
                )
              })}
            </div>
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
                    <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11, display: 'block' }} onClick={() => setSelectedOrder(o)}>
                      View invoice
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={'badge badge-' + o.status}>{o.status}</span>
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

        {tab === 'profile' && (
          <ProfileTab profile={profile} onSave={(updated: any) => setProfile({ ...profile, ...updated })} />
        )}
      </div>

        {tab === 'settings' && (
          <SettingsTab
            profile={profile}
            onProfileUpdate={(updates: any) => setProfile({ ...profile, ...updates })}
          />
        )}  
      
      {selectedOrder && (
        <InvoiceModal order={selectedOrder} profile={profile} onClose={() => setSelectedOrder(null)} />
      )}
      {selectedPayout && (
        <RemittanceModal payout={selectedPayout} profile={profile} onClose={() => setSelectedPayout(null)} />
      )}
    </div>
  )
}

function EditArtworkForm({ artwork, onSave, onCancel }: { artwork: any, onSave: (updates: any) => void, onCancel: () => void }) {
  const CATEGORIES = [
    'Photography', 'Fine Art', 'Abstract', 'Illustration',
    'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
  ]
  const [form, setForm] = useState({
    title: artwork.title || '',
    description: artwork.description || '',
    price: String(artwork.price || ''),
    category: artwork.category || 'Photography',
    paintingBy: artwork.painting_by || '',
    sizes: artwork.sizes || ['A4', 'A3'],
  })

  function toggleSize(size: string) {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s: string) => s !== size) : [...prev.sizes, size],
    }))
  }

  return (
    <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid var(--color-border)', background: 'var(--color-background-secondary)' }}>
      <p style={{ fontSize: 13, fontWeight: 500, padding: '12px 0 10px' }}>Edit listing</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Painting by (optional)</label>
        <input className="form-input" value={form.paintingBy} onChange={e => setForm({ ...form, paintingBy: e.target.value })} placeholder="e.g. Ahmed Naif" />
      </div>
      <div className="form-group">
        <label className="form-label">Price (MVR)</label>
        <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ maxWidth: 120 }} />
      </div>
      <div className="form-group">
        <label className="form-label">Available sizes</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['A4', 'A3'].map(size => (
            <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.sizes.includes(size)} onChange={() => toggleSize(size)} />
              {size}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => onSave({ title: form.title, description: form.description, price: parseInt(form.price) || artwork.price, category: form.category, painting_by: form.paintingBy || null, sizes: form.sizes })}>
          Save changes
        </button>
        <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
