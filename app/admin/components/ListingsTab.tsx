'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import toast from 'react-hot-toast'

export function ListingsTab({ onBadgeRefresh }: { onBadgeRefresh: () => void }) {
  const [artworks, setArtworks]             = useState<any[]>([])
  const [waitlistCounts, setWaitlistCounts] = useState<Record<number, number>>({})
  const [loading, setLoading]               = useState(true)
  const [listingSearch, setListingSearch]   = useState('')
  const [listingStatus, setListingStatus]   = useState('all')
  const [notifyingId, setNotifyingId]       = useState<number | null>(null)
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid')
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
    onBadgeRefresh()
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ artworkId }),
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

  async function printArtworkLabel(artwork: any) {
    try {
      const { jsPDF } = await import('jspdf')
      const bwipjs    = (await import('bwip-js')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [62, 29] })
      const W   = 62
      const H   = 29

      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, W, H, 'F')

      const canvas = document.createElement('canvas')
      bwipjs.toCanvas(canvas, {
        bcid:            'code128',
        text:            artwork.sku,
        scale:           3,
        height:          8,
        includetext:     false,
        backgroundcolor: 'ffffff',
      })
      const barcodeDataUrl = canvas.toDataURL('image/png')

      const bcW = 50
      const bcH = 12
      const bcX = (W - bcW) / 2
      doc.addImage(barcodeDataUrl, 'PNG', bcX, 2, bcW, bcH)

      doc.setFont('courier', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(26, 26, 26)
      doc.text(artwork.sku, W / 2, 16, { align: 'center' })

      const title = artwork.title?.length > 28 ? artwork.title.slice(0, 26) + '…' : (artwork.title || '')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(80, 80, 80)
      doc.text(title, W / 2, 20, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(150, 150, 150)
      doc.text('shop.fineprintmv.com', W / 2, 25, { align: 'center' })

      doc.save('label-' + artwork.sku + '.pdf')
      toast.success('Label downloaded!')
    } catch (err: any) {
      toast.error('Label error: ' + err.message)
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

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filteredArtworks, viewMode === 'grid' ? 20 : PAGE_SIZES.listings)
  const totalWaiting = Object.values(waitlistCounts).reduce((s, c) => s + c, 0)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading listings...</div>

  return (
    <div>
      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Total',    artworks.length],
          ['Pending',  artworks.filter(a => a.status === 'pending').length],
          ['Approved', artworks.filter(a => a.status === 'approved').length],
          ['Waitlist', totalWaiting],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card"
            style={{ background: label === 'Pending' && (value as number) > 0 ? '#FAEEDA' : undefined }}
          >
            <p className="stat-label" style={{ color: label === 'Pending' && (value as number) > 0 ? '#633806' : undefined }}>{label as string}</p>
            <p className="stat-value" style={{ color: label === 'Pending' && (value as number) > 0 ? '#633806' : undefined }}>{value as number}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => setViewMode('grid')} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'grid' ? '#1a1a1a' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)' }}>⊞</button>
          <button onClick={() => setViewMode('list')} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'list' ? '#1a1a1a' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)' }}>☰</button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ gridColumn: '1/-1', padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {filteredArtworks.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet.'}
            </p>
          ) : paginated.map((a: any) => {
            const waitCount = waitlistCounts[a.id] || 0
            const remaining = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            const isSoldOut = remaining === 0
            const artistName = a.profiles?.display_name || a.profiles?.full_name
            return (
              <div key={a.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ position: 'relative', aspectRatio: '1/1', background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                  {a.preview_url
                    ? <img src={a.preview_url} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 32 }}>🖼</div>
                  }
                  {/* Status badge */}
                  <span className={'badge badge-' + a.status} style={{ position: 'absolute', top: 8, left: 8, fontSize: 9 }}>{a.status}</span>
                  {/* Sold out */}
                  {isSoldOut && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, background: '#FCEBEB', color: '#A32D2D', padding: '2px 7px', borderRadius: 20 }}>Sold out</span>}
                  {/* Waitlist */}
                  {waitCount > 0 && (
                    <span style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, background: '#E1F5EE', color: '#0F6E56', padding: '2px 7px', borderRadius: 20 }}>
                      {waitCount} waiting
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '10px 12px', flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>{artistName}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="sku-tag" style={{ fontSize: 9 }}>{a.sku}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{formatMVR(a.price)}</span>
                  </div>
                  {a.paper_type && a.paper_type !== 'Photo Luster' && (
                    <span style={{ fontSize: 9, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20, display: 'inline-block', marginTop: 4 }}>{a.paper_type}</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '6px 10px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: '0.5px solid var(--color-border)' }}>
                  {a.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-success" style={{ fontSize: 10, padding: '3px 8px', flex: 1 }} onClick={() => handleArtworkAction(a.id, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => handleArtworkAction(a.id, 'rejected')}>Reject</button>
                    </>
                  )}
                  {a.hires_path && (
                    <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => downloadHires(a.hires_path)}>Hi-res</button>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '3px 8px', background: '#1a1a1a', color: '#fff', border: 'none' }}
                    onClick={() => printArtworkLabel(a)}
                  >
                    Label
                  </button>
                  {waitCount > 0 && (
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 10, padding: '3px 8px', background: '#E1F5EE', color: '#0F6E56', border: 'none' }}
                      onClick={() => handleNotifyWaitlist(a.id, a.title)}
                      disabled={notifyingId === a.id}
                    >
                      {notifyingId === a.id ? '...' : 'Notify'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              {filteredArtworks.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet.'}
            </p>
          ) : paginated.map((a: any) => {
            const waitCount  = waitlistCounts[a.id] || 0
            const remaining  = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            const isSoldOut  = remaining === 0
            const artistName = a.profiles?.display_name || a.profiles?.full_name
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                {a.preview_url && (
                  <img src={a.preview_url} alt={a.title} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="sku-tag">{a.sku}</span>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{a.title}</p>
                    <span className={'badge badge-' + a.status}>{a.status}</span>
                    {isSoldOut && (
                      <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 7px', borderRadius: 20 }}>Sold out</span>
                    )}
                    {a.edition_size && !isSoldOut && (
                      <span style={{ fontSize: 10, background: '#f0f0ec', color: 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>
                        {remaining} of {a.edition_size} left
                      </span>
                    )}
                    {a.paper_type && a.paper_type !== 'Photo Luster' && (
                      <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>{a.paper_type}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    by {artistName} · {formatMVR(a.price)}
                    {a.offer_label ? ' · ' + a.offer_label + ' ' + a.offer_pct + '% off' : ''}
                  </p>
                  {waitCount > 0 && (
                    <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 4 }}>{waitCount} buyer{waitCount !== 1 ? 's' : ''} on waitlist</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexDirection: 'column' }}>
                  {a.hires_path && (
                    <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => downloadHires(a.hires_path)}>Hi-res</button>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 11, background: '#1a1a1a', color: '#fff', border: 'none' }}
                    onClick={() => printArtworkLabel(a)}
                  >
                    Label
                  </button>
                  {a.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-success" style={{ fontSize: 11 }} onClick={() => handleArtworkAction(a.id, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => handleArtworkAction(a.id, 'rejected')}>Reject</button>
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
      )}

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
