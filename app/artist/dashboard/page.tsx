'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import { PaperDetailModal } from '@/app/artist/components/PaperDetailModal'
import toast from 'react-hot-toast'
import Header from '@/app/components/Header'
import { InvoiceModal } from '@/app/artist/components/InvoiceModal'
import { RemittanceModal } from '@/app/artist/components/RemittanceModal'
import { OffersTab } from '@/app/artist/components/OffersTab'
import { PayoutsTab } from '@/app/artist/components/PayoutsTab'
import { ExportTab } from '@/app/artist/components/ExportTab'
import { ProfileTab, AvatarDisplay } from '@/app/artist/components/ProfileTab'
import { UploadTab } from '@/app/artist/components/UploadTab'
import { SettingsTab } from '@/app/artist/components/SettingsTab'

const PLATFORM_FEE = 5
const TABS = ['listings', 'offers', 'upload', 'orders', 'payouts', 'export', 'profile', 'settings']

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '20px 0' }} />
}

export default function ArtistDashboard() {
  const router = useRouter()
  const [tab, setTab]                         = useState('listings')
  const [profile, setProfile]                 = useState<any>(null)
  const [artworks, setArtworks]               = useState<any[]>([])
  const [orders, setOrders]                   = useState<any[]>([])
  const [payouts, setPayouts]                 = useState<any[]>([])
  const [loading, setLoading]                 = useState(true)
  const [selectedOrder, setSelectedOrder]     = useState<any>(null)
  const [selectedPayout, setSelectedPayout]   = useState<any>(null)
  const [editingArtwork, setEditingArtwork]   = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || prof.role !== 'artist') { router.push('/storefront'); return }
    if (!prof.onboarding_complete) { router.push('/artist/onboarding'); return }
    setProfile(prof)
    await Promise.all([fetchArtworks(user.id), fetchOrders(user.id), fetchPayouts(user.id)])
    setLoading(false)
  }

  async function fetchArtworks(artistId: string) {
    const { data } = await supabase.from('artworks').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchOrders(artistId: string) {
    const { data: itemRows } = await supabase
      .from('order_items')
      .select('*, orders(*), artworks(title, sku)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })

    if (itemRows && itemRows.length > 0) {
      const orderMap: Record<number, any> = {}
      for (const item of itemRows) {
        const orderId = item.order_id
        if (!orderMap[orderId]) orderMap[orderId] = { ...item.orders, myItems: [], artist_earnings: 0 }
        orderMap[orderId].myItems.push(item)
        orderMap[orderId].artist_earnings += item.artist_earnings || 0
      }
      const merged = Object.values(orderMap)
      const { data: legacyOrders } = await supabase
        .from('orders')
        .select('*, artworks!inner(title, sku, artist_id)')
        .eq('artworks.artist_id', artistId)
        .order('created_at', { ascending: false })
      const legacyIds  = new Set(merged.map((o: any) => o.id))
      const legacyOnly = (legacyOrders || []).filter((o: any) => !legacyIds.has(o.id))
      setOrders([...merged, ...legacyOnly].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } else {
      const { data } = await supabase
        .from('orders')
        .select('*, artworks!inner(title, sku, artist_id)')
        .eq('artworks.artist_id', artistId)
        .order('created_at', { ascending: false })
      setOrders(data || [])
    }
  }

  async function fetchPayouts(artistId: string) {
    const { data } = await supabase.from('payouts').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function handleExport(from: string, to: string) {
    const res  = await fetch('/api/export?type=artist&from=' + from + '&to=' + to)
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

  const approvedOrders  = orders.filter(o => o.status === 'approved')
  const activeOrders    = orders.filter(o => o.status !== 'rejected')
  const rejectedOrders  = orders.filter(o => o.status === 'rejected')
  const totalEarnings   = approvedOrders.reduce((s: number, o: any) => s + o.artist_earnings, 0)
  const paidOut         = payouts.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
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
            <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>
              Log out
            </button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <AvatarDisplay profile={profile} size={48} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 2 }}>Artist dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="sku-tag">{profile?.artist_code ? 'FP-' + profile.artist_code : ''}</span>
              {profile?.shop_status === 'closed' ? (
                <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #EF9F27' }}>Shop closed</span>
              ) : (
                <span style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #5DCAA5' }}>Shop open</span>
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
            ['Total listings',  artworks.length],
            ['Orders received', approvedOrders.length],
            ['Pending payout',  formatMVR(pendingEarnings)],
            ['Total earned',    formatMVR(totalEarnings)],
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
          <ArtistListingsTab
            artworks={artworks}
            editingArtwork={editingArtwork}
            deleteConfirmId={deleteConfirmId}
            setEditingArtwork={setEditingArtwork}
            setDeleteConfirmId={setDeleteConfirmId}
            onToggleHide={toggleHide}
            onDelete={deleteArtwork}
            onSaveEdit={saveEdit}
          />
        )}

        {tab === 'offers'  && <OffersTab artworks={artworks} onRefresh={() => init()} />}
        {tab === 'upload'  && <UploadTab profile={profile} nextSeq={artworks.length + 1} onSuccess={() => { setTab('listings'); init() }} />}

        {tab === 'orders' && (
          <ArtistOrdersTab
            activeOrders={activeOrders}
            rejectedOrders={rejectedOrders}
            onViewInvoice={setSelectedOrder}
          />
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

        {tab === 'export'   && <ExportTab onExport={handleExport} orders={orders} />}
        {tab === 'profile'  && <ProfileTab profile={profile} onSave={(updated: any) => setProfile({ ...profile, ...updated })} />}
        {tab === 'settings' && <SettingsTab profile={profile} onProfileUpdate={(updates: any) => setProfile({ ...profile, ...updates })} />}
      </div>

      {selectedOrder  && <InvoiceModal order={selectedOrder} profile={profile} onClose={() => setSelectedOrder(null)} />}
      {selectedPayout && <RemittanceModal payout={selectedPayout} profile={profile} onClose={() => setSelectedPayout(null)} />}
    </div>
  )
}

// ── Artist listings tab ───────────────────────────────────────────────────
function ArtistListingsTab({ artworks, editingArtwork, deleteConfirmId, setEditingArtwork, setDeleteConfirmId, onToggleHide, onDelete, onSaveEdit }: any) {
  const [search, setSearch] = useState('')

  const filtered = artworks.filter((a: any) =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.sku?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  )

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filtered, PAGE_SIZES.listings)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          className="form-input"
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')}>Clear ×</button>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {filtered.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet. Upload your first artwork!'}
          </p>
        ) : paginated.map((a: any) => {
          const platformFee = Math.round(a.price * PLATFORM_FEE / 100)
          const artistEarns = a.price - platformFee
          const isEditing   = editingArtwork?.id === a.id
          const isDeleting  = deleteConfirmId === a.id
          const remaining   = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
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
                    {a.paper_type && (
                      <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>{a.paper_type}</span>
                    )}
                    {a.edition_size && (
                      <span style={{ fontSize: 10, background: remaining === 0 ? '#FCEBEB' : '#f0f0ec', color: remaining === 0 ? '#A32D2D' : 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>
                        {remaining === 0 ? 'Sold out' : remaining + ' of ' + a.edition_size + ' left'}
                      </span>
                    )}
                  </div>
                  {a.painting_by && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Painting by {a.painting_by}</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(artistEarns)}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>your earnings</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setEditingArtwork(isEditing ? null : a)}>
                  {isEditing ? 'Cancel edit' : 'Edit'}
                </button>
                {a.status !== 'pending' && (
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 11, background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'var(--color-background-secondary)', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: 'none' }}
                    onClick={() => onToggleHide(a)}
                  >
                    {a.status === 'hidden' ? 'Show listing' : 'Hide listing'}
                  </button>
                )}
                <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => setDeleteConfirmId(isDeleting ? null : a.id)}>
                  Delete
                </button>
              </div>
              {isDeleting && (
                <div style={{ padding: '0 20px 14px' }}>
                  <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: 13, color: '#A32D2D' }}>Permanently delete this listing? This cannot be undone.</p>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => onDelete(a.id)}>Yes, delete</button>
                    </div>
                  </div>
                </div>
              )}
              {isEditing && (
                <EditArtworkForm artwork={a} onSave={updates => onSaveEdit(a.id, updates)} onCancel={() => setEditingArtwork(null)} />
              )}
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />
    </div>
  )
}

// ── Artist orders tab ─────────────────────────────────────────────────────
function ArtistOrdersTab({ activeOrders, rejectedOrders, onViewInvoice }: any) {
  const [search, setSearch] = useState('')

  const filteredActive = activeOrders.filter((o: any) =>
    !search ||
    o.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_sku?.toLowerCase().includes(search.toLowerCase()) ||
    o.myItems?.some((i: any) => i.artworks?.title?.toLowerCase().includes(search.toLowerCase()))
  )

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filteredActive, PAGE_SIZES.orders)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          className="form-input"
          placeholder="Search invoice, SKU, artwork..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')}>Clear ×</button>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: rejectedOrders.length > 0 ? 20 : 0 }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {filteredActive.length === 0 && activeOrders.length > 0 ? 'No orders match your search.' : 'No orders yet.'}
          </p>
        ) : paginated.map((o: any) => {
          const myItems     = o.myItems || []
          const isMultiItem = myItems.length > 0
          const title       = isMultiItem ? myItems.map((i: any) => i.artworks?.title).join(', ') : o.artworks?.title
          const sizeLabel   = isMultiItem ? myItems.map((i: any) => i.print_size).join(', ') : o.print_size
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{title} — {sizeLabel}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {o.invoice_number} · {new Date(o.created_at).toLocaleDateString()}
                </p>
                <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{o.order_sku}</span>
                {o.status === 'approved' && (
                  <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11, display: 'block' }} onClick={() => onViewInvoice(o)}>
                    View invoice
                  </button>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span className={'badge badge-' + o.status}>{o.status}</span>
                <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{formatMVR(o.artist_earnings)}</p>
                {isMultiItem && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {myItems.length} item{myItems.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />

      {rejectedOrders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 10 }}>
            Rejected orders
            <span style={{ fontWeight: 400, color: '#A32D2D', fontSize: 12, marginLeft: 6 }}>· payment could not be verified</span>
          </p>
          <div style={{ border: '0.5px solid #F09595', borderRadius: 12, overflow: 'hidden' }}>
            {rejectedOrders.map((o: any) => {
              const myItems     = o.myItems || []
              const isMultiItem = myItems.length > 0
              const title       = isMultiItem ? myItems.map((i: any) => i.artworks?.title).join(', ') : o.artworks?.title
              const sizeLabel   = isMultiItem ? myItems.map((i: any) => i.print_size).join(', ') : o.print_size
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid #F09595', background: '#FCEBEB', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#A32D2D' }}>{title} — {sizeLabel}</p>
                    <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 2, opacity: 0.7 }}>
                      {o.invoice_number} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                    <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{o.order_sku}</span>
                    <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 6, lineHeight: 1.5 }}>
                      Payment could not be verified. Contact{' '}
                      <a href="mailto:hello@fineprintmv.com" style={{ color: '#A32D2D' }}>hello@fineprintmv.com</a>
                      {' '}if you think this is a mistake.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="badge badge-rejected">rejected</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Edit artwork form ─────────────────────────────────────────────────────
function EditArtworkForm({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const CATEGORIES = [
    'Photography', 'Fine Art', 'Abstract', 'Illustration',
    'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
  ]

  const { papers, loading: papersLoading, getPapersByCategory, getPaperAddOn, getDefaultPaper } = usePapers()

  const [form, setForm] = useState({
    title:       artwork.title       || '',
    description: artwork.description || '',
    price:       String(artwork.price || ''),
    category:    artwork.category    || 'Photography',
    paintingBy:  artwork.painting_by || '',
    sizes:       artwork.sizes       || ['A4', 'A3'],
  })
  const [paperType, setPaperType]                 = useState<string>(artwork.paper_type || '')
  const [isLimited, setIsLimited]                 = useState<boolean>(!!artwork.edition_size)
  const [editionSize, setEditionSize]             = useState<string>(String(artwork.edition_size || '50'))
  const [previewFile, setPreviewFile]             = useState<File | null>(null)
  const [previewThumb, setPreviewThumb]           = useState<string | null>(artwork.preview_url || null)
  const [hiresFile, setHiresFile]                 = useState<File | null>(null)
  const [existingGallery, setExistingGallery]     = useState<any[]>([])
  const [deletedGalleryIds, setDeletedGalleryIds] = useState<number[]>([])
  const [galleryFiles, setGalleryFiles]           = useState<(File | null)[]>([null, null, null])
  const [galleryThumbs, setGalleryThumbs]         = useState<(string | null)[]>([null, null, null])
  const [activeThumb, setActiveThumb]             = useState<'main' | number>('main')
  const [saving, setSaving]                       = useState(false)
  const [detailPaper, setDetailPaper]             = useState<any>(null)
  const supabase = createClient()

  const effectivePaperType = paperType || getDefaultPaper(form.category)
  const papersByCategory   = getPapersByCategory()
  const selectedPaper      = papers.find(p => p.name === effectivePaperType)
  const bestForKey         = CATEGORY_TO_BEST_FOR[form.category]

  useEffect(() => {
    async function loadGallery() {
      const { data } = await supabase
        .from('artwork_images')
        .select('*')
        .eq('artwork_id', artwork.id)
        .order('sort_order', { ascending: true })
      setExistingGallery(data || [])
    }
    loadGallery()
  }, [artwork.id])

  function handleCategoryChange(category: string) {
    setForm(f => ({ ...f, category }))
    setPaperType('')
  }

  const visibleGallery = existingGallery.filter(g => !deletedGalleryIds.includes(g.id))

  const bigImage = activeThumb === 'main'
    ? previewThumb
    : typeof activeThumb === 'number' && activeThumb < visibleGallery.length
    ? visibleGallery[activeThumb]?.url
    : typeof activeThumb === 'number'
    ? galleryThumbs[activeThumb - visibleGallery.length]
    : previewThumb

  function toggleSize(size: string) {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s: string) => s !== size) : [...prev.sizes, size],
    }))
  }

  function handlePreviewSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewFile(file)
    const reader = new FileReader()
    reader.onload = ev => { setPreviewThumb(ev.target?.result as string); setActiveThumb('main') }
    reader.readAsDataURL(file)
  }

  function handleNewGallerySelect(slotIndex: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = file; setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = ev.target?.result as string
      setGalleryThumbs(newThumbs); setActiveThumb(visibleGallery.length + slotIndex)
    }
    reader.readAsDataURL(file)
  }

  function clearNewGallerySlot(slotIndex: number) {
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = null; setGalleryFiles(newFiles)
    const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = null; setGalleryThumbs(newThumbs)
    if (activeThumb === visibleGallery.length + slotIndex) setActiveThumb('main')
  }

  function stageDeleteGalleryImage(img: any) {
    setDeletedGalleryIds(prev => [...prev, img.id])
    setActiveThumb('main')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates: any = {
        title:        form.title,
        description:  form.description,
        price:        parseInt(form.price) || artwork.price,
        category:     form.category,
        painting_by:  form.paintingBy || null,
        sizes:        form.sizes,
        paper_type:   effectivePaperType,
        edition_size: isLimited ? parseInt(editionSize) || null : null,
      }

      for (const id of deletedGalleryIds) {
        const img = existingGallery.find(g => g.id === id)
        if (!img) continue
        await supabase.from('artwork_images').delete().eq('id', id)
        try {
          const url  = new URL(img.url)
          const path = url.pathname.split('/artwork-previews/')[1]
          if (path) await supabase.storage.from('artwork-previews').remove([decodeURIComponent(path)])
        } catch {}
      }

      if (previewFile) {
        toast.loading('Uploading preview...', { id: 'edit-upload' })
        const ext  = previewFile.name.split('.').pop()
        const path = artwork.sku + '-preview.' + ext
        const { error } = await supabase.storage.from('artwork-previews').upload(path, previewFile, { upsert: true, contentType: previewFile.type })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(path)
        updates.preview_url = urlData.publicUrl
        toast.dismiss('edit-upload')
      }

      if (hiresFile) {
        toast.loading('Uploading hi-res...', { id: 'edit-hires' })
        const ext  = hiresFile.name.split('.').pop()
        const path = artwork.sku + '-hires.' + ext
        const { error } = await supabase.storage.from('artwork-hires').upload(path, hiresFile, { upsert: true, contentType: hiresFile.type })
        if (error) throw error
        updates.hires_path = path
        toast.dismiss('edit-hires')
      }

      if (galleryFiles.some(Boolean)) {
        toast.loading('Uploading gallery...', { id: 'edit-gallery' })
        const nextSort = visibleGallery.length + 1
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i]
          if (!gFile) continue
          const gExt  = gFile.name.split('.').pop()
          const gPath = 'gallery/' + artwork.sku + '-gallery-' + Date.now() + '-' + i + '.' + gExt
          const { error: gErr } = await supabase.storage.from('artwork-previews').upload(gPath, gFile, { contentType: gFile.type })
          if (gErr) { console.error(gErr); continue }
          const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
          await supabase.from('artwork_images').insert({ artwork_id: artwork.id, url: gUrl.publicUrl, sort_order: nextSort + i })
        }
        toast.dismiss('edit-gallery')
      }

      onSave(updates)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid var(--color-border)', background: 'var(--color-background-secondary)' }}>
      <p style={{ fontSize: 13, fontWeight: 500, padding: '12px 0 10px' }}>Edit listing</p>
      <div style={{ maxWidth: 520 }}>

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Images</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 10, marginBottom: 6 }}>
            <div
              onClick={() => document.getElementById('edit-preview-' + artwork.id)?.click()}
              style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {previewThumb ? (
                <img src={previewThumb} alt="main" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                  <p style={{ fontSize: 11 }}>Tap to upload</p>
                </div>
              )}
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 20, pointerEvents: 'none' }}>
                {previewFile ? '✓ Changed' : 'Main'}
              </div>
              {previewThumb && (
                <button
                  onClick={e => { e.stopPropagation(); setPreviewFile(null); setPreviewThumb(null); setActiveThumb('main') }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              )}
              <input type="file" id={'edit-preview-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={handlePreviewSelect} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map(i => {
                const existingImg = visibleGallery[i]
                const newThumb    = visibleGallery.length <= i ? galleryThumbs[i - visibleGallery.length] : null
                const thumbSrc    = existingImg ? existingImg.url : newThumb
                const isExisting  = !!existingImg
                return (
                  <div key={i} style={{ position: 'relative' }}>
                    <div
                      onClick={() => {
                        if (thumbSrc) setActiveThumb(isExisting ? i : visibleGallery.length + (i - visibleGallery.length))
                        else document.getElementById('edit-gallery-' + artwork.id + '-' + i)?.click()
                      }}
                      style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {thumbSrc
                        ? <img src={thumbSrc} alt={'g' + i} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                        : <span style={{ fontSize: 18, color: 'var(--color-border)' }}>+</span>
                      }
                    </div>
                    {thumbSrc && (
                      <button
                        onClick={e => { e.stopPropagation(); if (isExisting) stageDeleteGalleryImage(existingImg); else clearNewGallerySlot(i - visibleGallery.length) }}
                        style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: isExisting ? 'rgba(163,45,45,0.85)' : 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                      >×</button>
                    )}
                    <input type="file" id={'edit-gallery-' + artwork.id + '-' + i} accept="image/*" style={{ display: 'none' }} onChange={e => handleNewGallerySelect(i - visibleGallery.length < 0 ? 0 : i - visibleGallery.length, e.target.files?.[0] || null)} />
                  </div>
                )
              })}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tap main to replace · red × removes on save · + to add</p>
        </div>

        {/* Hi-res */}
        <div className="form-group">
          <label className="form-label">Hi-res print file</label>
          <div style={{ border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🖨</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {hiresFile ? hiresFile.name : artwork.hires_path || 'No file'}
              </p>
              {hiresFile && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{(hiresFile.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
            {hiresFile ? (
              <button onClick={() => { setHiresFile(null); (document.getElementById('edit-hires-' + artwork.id) as HTMLInputElement).value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
            ) : (
              <button onClick={() => document.getElementById('edit-hires-' + artwork.id)?.click()}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0 }}>Replace</button>
            )}
          </div>
          {hiresFile && (
            <button onClick={() => document.getElementById('edit-hires-' + artwork.id)?.click()}
              style={{ fontSize: 11, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'block' }}>Change file</button>
          )}
          <input type="file" id={'edit-hires-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>A4 min 2339×1654px · A3 min 3307×2339px</p>
        </div>

        <Divider />

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
          <select className="form-input" value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Painting by <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 11 }}>optional</span></label>
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

        <Divider />

        {/* Paper type */}
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Paper type</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>All prints use Hahnemühle archival papers. Upgrade for a premium feel.</p>
        </div>

        {papersLoading ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Loading papers...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {Object.entries(papersByCategory).map(([category, categoryPapers]) => (
              <div key={category}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 6, marginTop: 8 }}>{category}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(categoryPapers as any[]).map(paper => {
                    const isSelected    = effectivePaperType === paper.name
                    const addOnA4       = paper.addOn['A4'] || 0
                    const addOnA3       = paper.addOn['A3'] || 0
                    const hasPremium    = addOnA4 > 0 || addOnA3 > 0
                    const isOutOfStock  = !paper.in_stock
                    const isRecommended = bestForKey && paper.best_for?.includes(bestForKey)
                    return (
                      <div
                        key={paper.name}
                        onClick={() => !isOutOfStock && setPaperType(paper.name)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '10px 12px',
                          border: isSelected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)',
                          borderRadius: 10,
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'var(--color-surface)' : 'transparent',
                          opacity: isOutOfStock ? 0.45 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0, marginTop: 2, transition: 'all 0.15s' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{paper.name}</p>
                            {isRecommended && !isOutOfStock && (
                              <span style={{ fontSize: 10, background: '#185FA5', color: '#fff', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>✓ Recommended</span>
                            )}
                            {isOutOfStock && (
                              <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Out of stock</span>
                            )}
                            {paper.stock_status === 'backorder' && (
                              <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Backorder</span>
                            )}
                            {!hasPremium && !isOutOfStock && (
                              <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Included</span>
                            )}
                            {hasPremium && !isOutOfStock && (
                              <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>
                                +{formatMVR(addOnA4)} A4 · +{formatMVR(addOnA3)} A3
                              </span>
                            )}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDetailPaper(paper) }}
                            style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', textDecoration: 'underline', display: 'block' }}
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPaper && (selectedPaper.addOn['A4'] > 0 || selectedPaper.addOn['A3'] > 0) && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
              ℹ️ <strong>{selectedPaper.name}</strong> adds a paper upgrade fee to the buyer's total. This does not affect your earnings.
            </p>
          </div>
        )}

        <Divider />

        {/* Limited edition */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold.</p>
            </div>
            <div onClick={() => setIsLimited(v => !v)} style={{ width: 44, height: 26, borderRadius: 13, background: isLimited ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: isLimited ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          {isLimited && (
            <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
              {artwork.edition_size && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span>Edition size: <strong style={{ color: 'var(--color-text)' }}>{artwork.edition_size}</strong></span>
                  <span>Sold: <strong style={{ color: 'var(--color-text)' }}>{artwork.editions_sold || 0}</strong></span>
                  <span>Remaining: <strong style={{ color: artwork.edition_size - (artwork.editions_sold || 0) === 0 ? '#A32D2D' : '#1D9E75' }}>{artwork.edition_size - (artwork.editions_sold || 0)}</strong></span>
                </div>
              )}
              <label className="form-label" style={{ marginBottom: 6 }}>Edition size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input className="form-input" type="number" min={artwork.editions_sold || 1} max="999" value={editionSize} onChange={e => setEditionSize(e.target.value)} style={{ maxWidth: 100 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
              </div>
              {artwork.editions_sold > 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                  ⚠️ Minimum {artwork.editions_sold} — cannot set lower than already sold.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </div>

      {/* Paper detail modal */}
      {detailPaper && (
        <PaperDetailModal
          paper={detailPaper}
          onClose={() => setDetailPaper(null)}
        />
      )}
    </div>
  )
}
