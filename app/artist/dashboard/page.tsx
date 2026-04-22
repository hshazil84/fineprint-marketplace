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
import { ProfileTab, AvatarDisplay } from '@/app/artist/components/ProfileTab'
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
    const { data: itemRows } = await supabase
      .from('order_items')
      .select('*, orders(*), artworks(title, sku)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })

    if (itemRows && itemRows.length > 0) {
      const orderMap: Record<number, any> = {}
      for (const item of itemRows) {
        const orderId = item.order_id
        if (!orderMap[orderId]) {
          orderMap[orderId] = { ...item.orders, myItems: [], artist_earnings: 0 }
        }
        orderMap[orderId].myItems.push(item)
        orderMap[orderId].artist_earnings += item.artist_earnings || 0
      }
      const merged = Object.values(orderMap)
      const { data: legacyOrders } = await supabase
        .from('orders')
        .select('*, artworks!inner(title, sku, artist_id)')
        .eq('artworks.artist_id', artistId)
        .order('created_at', { ascending: false })
      const legacyIds = new Set(merged.map((o: any) => o.id))
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
                const isEditing   = editingArtwork?.id === a.id
                const isDeleting  = deleteConfirmId === a.id
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
                    <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setEditingArtwork(isEditing ? null : a)}>
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
                            <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => deleteArtwork(a.id)}>Yes, delete</button>
                          </div>
                        </div>
                      </div>
                    )}
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
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: rejectedOrders.length > 0 ? 20 : 0 }}>
              {activeOrders.length === 0 ? (
                <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No orders yet.</p>
              ) : activeOrders.map(o => {
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
                        <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11, display: 'block' }} onClick={() => setSelectedOrder(o)}>
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

            {rejectedOrders.length > 0 && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 10 }}>
                  Rejected orders
                  <span style={{ fontWeight: 400, color: '#A32D2D', fontSize: 12, marginLeft: 6 }}>· payment could not be verified</span>
                </p>
                <div style={{ border: '0.5px solid #F09595', borderRadius: 12, overflow: 'hidden' }}>
                  {rejectedOrders.map(o => {
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

        {tab === 'settings' && (
          <SettingsTab
            profile={profile}
            onProfileUpdate={(updates: any) => setProfile({ ...profile, ...updates })}
          />
        )}
      </div>

      {selectedOrder && (
        <InvoiceModal order={selectedOrder} profile={profile} onClose={() => setSelectedOrder(null)} />
      )}
      {selectedPayout && (
        <RemittanceModal payout={selectedPayout} profile={profile} onClose={() => setSelectedPayout(null)} />
      )}
    </div>
  )
}

function EditArtworkForm({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const CATEGORIES = [
    'Photography', 'Fine Art', 'Abstract', 'Illustration',
    'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
  ]
  const [form, setForm] = useState({
    title:       artwork.title       || '',
    description: artwork.description || '',
    price:       String(artwork.price || ''),
    category:    artwork.category    || 'Photography',
    paintingBy:  artwork.painting_by || '',
    sizes:       artwork.sizes       || ['A4', 'A3'],
  })
  const [previewFile, setPreviewFile]         = useState<File | null>(null)
  const [previewThumb, setPreviewThumb]       = useState<string | null>(artwork.preview_url || null)
  const [hiresFile, setHiresFile]             = useState<File | null>(null)
  const [existingGallery, setExistingGallery] = useState<any[]>([])
  const [deletedGalleryIds, setDeletedGalleryIds] = useState<number[]>([])
  const [galleryFiles, setGalleryFiles]       = useState<(File | null)[]>([null, null, null])
  const [galleryThumbs, setGalleryThumbs]     = useState<(string | null)[]>([null, null, null])
  const [activeThumb, setActiveThumb]         = useState<'main' | number>('main')
  const [saving, setSaving]                   = useState(false)
  const supabase = createClient()

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

  // Visible existing gallery = not yet marked for deletion
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
    reader.onload = ev => {
      setPreviewThumb(ev.target?.result as string)
      setActiveThumb('main')
    }
    reader.readAsDataURL(file)
  }

  function handleNewGallerySelect(slotIndex: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]
    newFiles[slotIndex] = file
    setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...galleryThumbs]
      newThumbs[slotIndex] = ev.target?.result as string
      setGalleryThumbs(newThumbs)
      setActiveThumb(visibleGallery.length + slotIndex)
    }
    reader.readAsDataURL(file)
  }

  function clearNewGallerySlot(slotIndex: number) {
    const newFiles  = [...galleryFiles]
    const newThumbs = [...galleryThumbs]
    newFiles[slotIndex]  = null
    newThumbs[slotIndex] = null
    setGalleryFiles(newFiles)
    setGalleryThumbs(newThumbs)
    if (activeThumb === visibleGallery.length + slotIndex) setActiveThumb('main')
  }

  // Stage deletion — don't actually delete until Save
  function stageDeleteGalleryImage(img: any) {
    setDeletedGalleryIds(prev => [...prev, img.id])
    if (activeThumb !== 'main') setActiveThumb('main')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates: any = {
        title:       form.title,
        description: form.description,
        price:       parseInt(form.price) || artwork.price,
        category:    form.category,
        painting_by: form.paintingBy || null,
        sizes:       form.sizes,
      }

      // Delete staged gallery removals
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

      // Upload new preview
      if (previewFile) {
        toast.loading('Uploading preview...', { id: 'edit-upload' })
        const ext   = previewFile.name.split('.').pop()
        const path  = artwork.sku + '-preview.' + ext
        const { error } = await supabase.storage.from('artwork-previews').upload(path, previewFile, { upsert: true, contentType: previewFile.type })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(path)
        updates.preview_url = urlData.publicUrl
        toast.dismiss('edit-upload')
      }

      // Upload new hi-res
      if (hiresFile) {
        toast.loading('Uploading hi-res...', { id: 'edit-hires' })
        const ext   = hiresFile.name.split('.').pop()
        const path  = artwork.sku + '-hires.' + ext
        const { error } = await supabase.storage.from('artwork-hires').upload(path, hiresFile, { upsert: true, contentType: hiresFile.type })
        if (error) throw error
        updates.hires_path = path
        toast.dismiss('edit-hires')
      }

      // Upload new gallery images
      const hasNewGallery = galleryFiles.some(Boolean)
      if (hasNewGallery) {
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

  const newSlots = Math.max(0, 3 - visibleGallery.length)

  return (
    <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid var(--color-border)', background: 'var(--color-background-secondary)' }}>
      <p style={{ fontSize: 13, fontWeight: 500, padding: '12px 0 10px' }}>Edit listing</p>

      <div style={{ maxWidth: 520 }}>

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Images</label>

          {/* Big preview */}
          <div
            style={{
              aspectRatio: '4/3',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--color-surface)',
              border: '0.5px solid var(--color-border)',
              marginBottom: 8,
              position: 'relative',
              cursor: bigImage ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => !bigImage && document.getElementById('edit-preview-' + artwork.id)?.click()}
          >
            {bigImage ? (
              <>
                <img src={bigImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                {activeThumb === 'main' && previewFile && (
                  <button
                    onClick={e => { e.stopPropagation(); setPreviewFile(null); setPreviewThumb(artwork.preview_url) }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>+</div>
                <p style={{ fontSize: 12 }}>Tap to upload main preview</p>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 }}>

            {/* Main thumbnail */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setActiveThumb('main')}
                style={{
                  aspectRatio: '4/3',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: activeThumb === 'main' ? '2px solid #1a1a1a' : '0.5px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  transition: 'border-color 0.15s',
                }}
              >
                {previewThumb
                  ? <img src={previewThumb} alt="main" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>+</div>
                }
              </div>
              <button
                onClick={() => document.getElementById('edit-preview-' + artwork.id)?.click()}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', padding: '3px 0', textAlign: 'center', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}
              >
                {previewFile ? '✓ Changed' : 'Main · replace'}
              </button>
              <input type="file" id={'edit-preview-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={handlePreviewSelect} />
            </div>

            {/* Existing gallery — staged deletions shown as faded */}
            {visibleGallery.map((img, i) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <div
                  onClick={() => setActiveThumb(i)}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: activeThumb === i ? '2px solid #1a1a1a' : '0.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <img src={img.url} alt={'gallery ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                </div>
                <button
                  onClick={() => stageDeleteGalleryImage(img)}
                  style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(163,45,45,0.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  title="Remove on save"
                >×</button>
              </div>
            ))}

            {/* New gallery slots */}
            {Array.from({ length: newSlots }).map((_, slotIndex) => {
              const thumb    = galleryThumbs[slotIndex]
              const isActive = activeThumb === visibleGallery.length + slotIndex
              return (
                <div key={'new-' + slotIndex} style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      if (thumb) setActiveThumb(visibleGallery.length + slotIndex)
                      else document.getElementById('edit-gallery-' + artwork.id + '-' + slotIndex)?.click()
                    }}
                    style={{
                      aspectRatio: '4/3',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isActive ? '2px solid #1a1a1a' : thumb ? '0.5px solid var(--color-border)' : '0.5px dashed var(--color-border)',
                      background: 'var(--color-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {thumb
                      ? <img src={thumb} alt="new" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                      : <span style={{ fontSize: 20, color: 'var(--color-text-muted)', opacity: 0.4 }}>+</span>
                    }
                  </div>
                  {thumb && (
                    <button
                      onClick={() => clearNewGallerySlot(slotIndex)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >×</button>
                  )}
                  <input
                    type="file"
                    id={'edit-gallery-' + artwork.id + '-' + slotIndex}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleNewGallerySelect(slotIndex, e.target.files?.[0] || null)}
                  />
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Tap thumbnails to preview · red × removes on save · empty slots add new
          </p>
        </div>

        {/* Hi-res file */}
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
              <button
                onClick={() => { setHiresFile(null); (document.getElementById('edit-hires-' + artwork.id) as HTMLInputElement).value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
              >×</button>
            ) : (
              <button
                onClick={() => document.getElementById('edit-hires-' + artwork.id)?.click()}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0 }}
              >
                Replace
              </button>
            )}
          </div>
          {hiresFile && (
            <button
              onClick={() => document.getElementById('edit-hires-' + artwork.id)?.click()}
              style={{ fontSize: 11, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'block' }}
            >
              Change file
            </button>
          )}
          <input type="file" id={'edit-hires-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>A4 min 2339×1654px · A3 min 3307×2339px</p>
        </div>

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
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={onCancel} disabled={saving}>Cancel</button>
        </div>

      </div>
    </div>
  )
}
