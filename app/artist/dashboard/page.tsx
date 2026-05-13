'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import { getGreeting, getDailyQuote, getSpecialDay } from '@/lib/greetings'
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
import { ArtistListingsTab } from '@/app/artist/components/ArtistListingsTab'
import { ArtistOrdersTab } from '@/app/artist/components/ArtistOrdersTab'

const TABS = ['listings', 'offers', 'upload', 'orders', 'payouts', 'export', 'profile', 'settings']

export default function ArtistDashboard() {
  const router = useRouter()
  const [tab, setTab]                         = useState('listings')
  const [profile, setProfile]                 = useState<any>(null)
  const [artworks, setArtworks]               = useState<any[]>([])
  const [orders, setOrders]                   = useState<any[]>([])
  const [payouts, setPayouts]                 = useState<any[]>([])
  const [draftCount, setDraftCount]           = useState(0)
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
    await Promise.all([
      fetchArtworks(user.id),
      fetchOrders(user.id),
      fetchPayouts(user.id),
      fetchDrafts(),
    ])
    setLoading(false)
  }

  async function fetchArtworks(artistId: string) {
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchArtworks(artistId: string) {
    const { data } = await supabase
      .from('artworks')
      .select('*, artwork_series(name)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    setArtworks((data || []).map((a: any) => ({
      ...a,
      series_name: a.artwork_series?.name || null,
    })))
  }

  async function fetchPayouts(artistId: string) {
    const { data } = await supabase
      .from('payouts')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function fetchDrafts() {
    try {
      const res  = await fetch('/api/artwork/draft')
      const json = await res.json()
      setDraftCount((json.drafts || []).length)
    } catch {
      setDraftCount(0)
    }
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

  const displayName     = profile?.display_name || profile?.full_name || 'Artist'
  const specialDay      = getSpecialDay()
  const { message: greetingMessage, emoji } = getGreeting(displayName)
  const quote           = getDailyQuote(specialDay)

  const activeOrders    = orders.filter(o => o.status !== 'rejected')
  const rejectedOrders  = orders.filter(o => o.status === 'rejected')
  const totalEarnings   = orders.reduce((s: number, o: any) => s + (o.artist_earnings || 0), 0)
  const paidOut         = payouts.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
  const pendingEarnings = Math.max(0, totalEarnings - paidOut)

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header
        minimal={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{displayName}</span>
            <button className="btn btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>
              Log out
            </button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* ── Greeting + quote ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <AvatarDisplay profile={profile} size={52} />
          <div style={{ flex: 1 }}>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0 0 6px', lineHeight: 1.2 }}>
              {greetingMessage} {emoji}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="sku-tag">{profile?.artist_code ? 'FP-' + profile.artist_code : ''}</span>
              {profile?.shop_status === 'closed' ? (
                <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #EF9F27' }}>Shop closed</span>
              ) : (
                <span style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '2px 10px', borderRadius: 20, border: '0.5px solid #5DCAA5' }}>Shop open</span>
              )}
            </div>

            <div style={{ borderLeft: '2.5px solid var(--color-border)', paddingLeft: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.75, margin: '0 0 5px', fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                &ldquo;{quote.text}&rdquo;
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.03em', opacity: 0.75 }}>
                — {quote.author}
              </p>
            </div>

          </div>
        </div>

        {/* ── Protection banner ─────────────────────────────────────────── */}
        <div className="protection-banner" style={{ marginBottom: 20 }}>
          <span>🔒</span>
          <span>Your artwork is protected — buyers only see your watermarked preview. Hi-res files are stored privately for print fulfillment only.</span>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            ['Total listings',  artworks.length],
            ['Orders received', activeOrders.length],
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
                <p style={{ fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>Tap to request →</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'payouts' && payouts.filter(p => p.status === 'pending').length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {payouts.filter(p => p.status === 'pending').length}
                </span>
              )}
              {t === 'upload' && draftCount > 0 && (
                <span style={{ marginLeft: 6, background: '#185FA5', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {draftCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        {tab === 'listings' && (
          <ArtistListingsTab
            artworks={artworks}
            profile={profile}
            editingArtwork={editingArtwork}
            deleteConfirmId={deleteConfirmId}
            setEditingArtwork={setEditingArtwork}
            setDeleteConfirmId={setDeleteConfirmId}
            onToggleHide={toggleHide}
            onDelete={deleteArtwork}
            onSaveEdit={saveEdit}
            onUpload={() => setTab('upload')}
            onRefresh={() => profile && fetchArtworks(profile.id)}
          />
        )}

        {tab === 'offers'  && <OffersTab artworks={artworks} onRefresh={() => init()} />}
        
        {tab === 'upload'  && (
          <UploadTab
            profile={profile}
            onDraftSaved={() => fetchDrafts()}
            onSubmitted={() => { setTab('listings'); init() }}
          />
        )}

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
