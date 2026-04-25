'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import toast from 'react-hot-toast'

export function ListingsTab({ onBadgeRefresh }: { onBadgeRefresh: () => void }) {
  const [artworks, setArtworks]         = useState<any[]>([])
  const [waitlistCounts, setWaitlistCounts] = useState<Record<number, number>>({})
  const [loading, setLoading]           = useState(true)
  const [listingSearch, setListingSearch] = useState('')
  const [listingStatus, setListingStatus] = useState('all')
  const [notifyingId, setNotifyingId]   = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    await Promise.all([fetchArtworks(), fetchWaitlistCounts()])
    setLoading(false)
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name, display_name)')
      .order('created_at', { ascending: false })
    setArtworks(data || [])
  }

  async function fetchWaitlistCounts() {
    const { data } = await supabase
      .from('waitlist')
      .select('artwork_id')
      .is('notified_at', null)
    if (data) {
      const counts: Record<number, number> = {}
      data.forEach((w: any) => { counts[w.artwork_id] = (counts[w.artwork_id] || 0) + 1 })
      setWaitlistCounts(counts)
    }
  }

  async function handleArtworkAction(id: number, status: 'approved' | 'rejected') {
    await supabase.from('artworks').update({ status }).eq('id', id)
    toast.success('Artwork ' + status)
    fetchArtworks()
  }

  async function downloadHires(hiresPath: string) {
    const { data } = await supabase.storage.from('artwork-hires').createSignedUrl(hiresPath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not generate download link')
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
      onBadgeRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNotifyingId(null)
    }
  }

  const filteredArtworks = artworks.filter(a => {
    const matchSearch = !listingSearch ||
      a.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.sku?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.profiles?.full_name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      a.profiles?.display_name?.toLowerCase().includes(listingSearch.toLowerCase())
    const matchStatus = listingStatus === 'all' || a.status === listingStatus
    return matchSearch && matchStatus
  })

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filteredArtworks, PAGE_SIZES.listings)

  const totalWaiting = Object.values(waitlistCounts).reduce((s, c) => s + c, 0)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading listings...</div>

  return (
    <div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Total',    artworks.length],
          ['Pending',  artworks.filter(a => a.status === 'pending').length],
          ['Approved', artworks.filter(a => a.status === 'approved').length],
          ['Waitlist', totalWaiting],
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

      {/* Listings */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {filteredArtworks.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet.'}
          </p>
        ) : paginated.map((a: any) => {
          const waitCount = waitlistCounts[a.id] || 0
          const remaining = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
          const isSoldOut = remaining === 0
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
              {a.preview_url && (
                <img
                  src={a.preview_url}
                  alt={a.title}
                  style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }}
                />
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
                  <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 4 }}>
                    {waitCount} buyer{waitCount !== 1 ? 's' : ''} on waitlist
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexDirection: 'column' }}>
                {a.hires_path && (
                  <button className="btn btn-sm" onClick={() => downloadHires(a.hires_path)}>Hi-res</button>
                )}
                {a.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleArtworkAction(a.id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleArtworkAction(a.id, 'rejected')}>Reject</button>
                  </div>
                )}
                {waitCount > 0 && (
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', border: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleNotifyWaitlist(a.id, a.title)}
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        startIndex={startIndex}
        endIndex={endIndex}
        onPage={setPage}
      />
    </div>
  )
}
