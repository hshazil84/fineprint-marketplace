'use client'
import { useEffect, useState, useRef } from 'react'
import { formatMVR } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import { PaperDetailModal } from '@/app/artist/components/PaperDetailModal'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const PLATFORM_FEE = 5
const APP_URL = 'https://shop.fineprintmv.com'

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '20px 0' }} />
}

// ── QR Modal ─────────────────────────────────────────────────────────────
function QRModal({ artwork, profile, onClose }: { artwork: any, profile: any, onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = APP_URL + '/artwork/' + artwork.id

  useEffect(() => {
    async function renderQR() {
      if (!canvasRef.current) return
      const QRCode = (await import('qrcode')).default
      await QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    }
    renderQR()
  }, [url])

  async function downloadPDF() {
    setDownloading(true)
    try {
      const QRCode = (await import('qrcode')).default
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' })
      const W = 105
      const H = 148

      // Background
      doc.setFillColor(245, 243, 238)
      doc.rect(0, 0, W, H, 'F')

      // Artwork image — correct aspect ratio, top portion
      if (artwork.preview_url) {
        try {
          // Load image to get natural dimensions
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise((res, rej) => {
            img.onload = res
            img.onerror = rej
            img.src = artwork.preview_url
          })
          // Draw at correct aspect ratio, cropped to fit width
          const imgW = W
          const imgH = Math.min(55, (img.naturalHeight / img.naturalWidth) * W)
          doc.addImage(artwork.preview_url, 'JPEG', 0, 0, imgW, imgH)
        } catch {}
      }

      // White/cream content area
      doc.setFillColor(245, 243, 238)
      doc.rect(0, 58, W, H - 58, 'F')

      // Artwork title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(26, 26, 26)
      const title = artwork.title || 'Untitled'
      const titleLines = doc.splitTextToSize(title, W - 16)
      doc.text(titleLines[0], W / 2, 68, { align: 'center' })

      // Artist name
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(136, 135, 128)
      const artistLine = (profile?.display_name || profile?.full_name || '') + ' · FP-' + (profile?.artist_code || '')
      doc.text(artistLine, W / 2, 75, { align: 'center' })

      // QR code — centered, correct size
      const qrSize = 50
      const qrX = (W - qrSize) / 2
      doc.addImage(qrDataUrl, 'PNG', qrX, 80, qrSize, qrSize)

      // Scan label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(170, 168, 160)
      doc.text('scan to own this print', W / 2, 135, { align: 'center' })

      // FinePrint logo from public folder
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise((res, rej) => {
          logoImg.onload = res
          logoImg.onerror = rej
          logoImg.src = '/Asset 1fineprint_long.png'
        })
        // Logo at bottom, centered, small
        const logoW = 40
        const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW
        doc.addImage('/Asset 1fineprint_long.png', 'PNG', (W - logoW) / 2, 138, logoW, logoH)
      } catch {
        // Fallback text logo
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(26, 26, 26)
        doc.text('fineprint', W / 2 - 1, 143, { align: 'right' })
        doc.setFont('helvetica', 'bold')
        doc.text('studio', W / 2 + 1, 143, { align: 'left' })
      }

      doc.save('fineprint-' + (artwork.sku || artwork.id) + '-qr.pdf')
      toast.success('QR card downloaded!')
    } catch (err: any) {
      toast.error('Download failed: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a', flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>QR card — {artwork.title}</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff', cursor: 'pointer' }}>Close</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: 20 }}>

          {/* Card preview */}
          <div style={{ background: '#f5f3ee', borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e0ddd6', maxWidth: 200, margin: '0 auto' }}>
            {artwork.preview_url && (
              <img
                src={artwork.preview_url}
                alt={artwork.title}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', margin: '0 0 2px' }}>{artwork.title}</p>
                <p style={{ fontSize: 9, color: '#888780', margin: 0 }}>
                  {profile?.display_name || profile?.full_name} · FP-{profile?.artist_code}
                </p>
              </div>

              {/* Real QR code */}
              <div style={{ background: '#fff', borderRadius: 6, padding: 4, border: '0.5px solid #e0ddd6' }}>
                <canvas ref={canvasRef} style={{ display: 'block', width: 100, height: 100 }} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 8, color: '#aaa8a0', margin: '0 0 3px' }}>scan to own this print</p>
                <img src="/Asset 1fineprint_long.png" alt="FinePrint Studio" style={{ height: 14, width: 'auto', opacity: 0.8 }} />
              </div>
            </div>
          </div>

          {/* URL */}
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 10, wordBreak: 'break-all' }}>{url}</p>

          {/* Info */}
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Print this A6 card and place it next to your artwork in galleries, cafes, or hotels. Buyers scan to view and order your print.
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={downloadPDF}
            disabled={downloading}
            style={{ width: '100%', marginTop: 14, padding: '13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1 }}
          >
            {downloading ? 'Generating PDF...' : 'Download A6 PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────
function EditModal({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
      />
      {/* Sheet / Modal */}
      <div style={{
        position: 'fixed',
        zIndex: 301,
        background: 'var(--color-background-primary)',
        overflowY: 'auto',
        // Mobile: bottom sheet
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: '20px 20px 0 0',
        maxHeight: '92dvh',
        // Desktop override via media query handled inline via JS
      }}
        className="edit-modal-sheet"
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-secondary)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px' }}>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Edit listing</p>
          <button onClick={onCancel} style={{ background: 'var(--color-background-secondary)', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Cancel</button>
        </div>

        <div style={{ padding: '0 20px 40px' }}>
          <EditArtworkForm artwork={artwork} onSave={onSave} onCancel={onCancel} />
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .edit-modal-sheet {
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            bottom: auto !important;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 560px;
            border-radius: 16px !important;
            max-height: 90vh !important;
          }
        }
      `}</style>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function ArtistListingsTab({ artworks, profile, editingArtwork, deleteConfirmId, setEditingArtwork, setDeleteConfirmId, onToggleHide, onDelete, onSaveEdit }: any) {
  const [search, setSearch]       = useState('')
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid')
  const [qrArtwork, setQrArtwork] = useState<any>(null)

  const filtered = artworks.filter((a: any) =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.sku?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  )

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filtered, viewMode === 'grid' ? 12 : PAGE_SIZES.listings)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')}>Clear ×</button>}
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'grid' ? '#1a1a1a' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)' }}
          >⊞</button>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'list' ? '#1a1a1a' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)' }}
          >☰</button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ gridColumn: '1/-1', padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {filtered.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet. Upload your first artwork!'}
            </p>
          ) : paginated.map((a: any) => {
            const platformFee = Math.round(a.price * PLATFORM_FEE / 100)
            const artistEarns = a.price - platformFee
            const remaining   = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            const isDeleting  = deleteConfirmId === a.id
            return (
              <div key={a.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '1/1', background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                  {a.preview_url ? (
                    <img src={a.preview_url} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: a.status === 'hidden' ? 0.4 : 1 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 24 }}>🖼</div>
                  )}
                  <span className={'badge badge-' + a.status} style={{ position: 'absolute', top: 6, left: 6, fontSize: 9 }}>{a.status}</span>
                  {remaining === 0 && (
                    <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, background: '#FCEBEB', color: '#A32D2D', padding: '1px 6px', borderRadius: 20 }}>Sold out</span>
                  )}
                </div>
                <div style={{ padding: '8px 10px 4px', flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 3px' }}>{formatMVR(artistEarns)}</p>
                  <span className="sku-tag" style={{ fontSize: 9 }}>{a.sku}</span>
                </div>
                <div style={{ padding: '6px 10px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setEditingArtwork(a)}>Edit</button>
                  <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setQrArtwork(a)}>QR</button>
                  {a.status !== 'pending' && (
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 10, padding: '3px 8px', background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'transparent', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: a.status === 'hidden' ? 'none' : '0.5px solid var(--color-border)' }}
                      onClick={() => onToggleHide(a)}
                    >{a.status === 'hidden' ? 'Show' : 'Hide'}</button>
                  )}
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setDeleteConfirmId(isDeleting ? null : a.id)}>Del</button>
                </div>
                {isDeleting && (
                  <div style={{ margin: '0 10px 10px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8 }}>Delete permanently?</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: 10 }} onClick={() => onDelete(a.id)}>Yes</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {filtered.length === 0 && artworks.length > 0 ? 'No listings match your search.' : 'No listings yet. Upload your first artwork!'}
            </p>
          ) : paginated.map((a: any) => {
            const platformFee = Math.round(a.price * PLATFORM_FEE / 100)
            const artistEarns = a.price - platformFee
            const isDeleting  = deleteConfirmId === a.id
            const remaining   = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            return (
              <div key={a.id} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                  {a.preview_url && (
                    <img src={a.preview_url} alt={a.title} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, opacity: a.status === 'hidden' ? 0.4 : 1 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="sku-tag">{a.sku}</span>
                      <span className={'badge badge-' + a.status}>{a.status}</span>
                      {a.paper_type && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>{a.paper_type}</span>}
                      {a.edition_size && <span style={{ fontSize: 10, background: remaining === 0 ? '#FCEBEB' : '#f0f0ec', color: remaining === 0 ? '#A32D2D' : 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>{remaining === 0 ? 'Sold out' : remaining + ' left'}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(artistEarns)}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>earnings</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setEditingArtwork(a)}>Edit</button>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setQrArtwork(a)}>QR card</button>
                  {a.status !== 'pending' && (
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11, background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'var(--color-background-secondary)', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: 'none' }}
                      onClick={() => onToggleHide(a)}
                    >{a.status === 'hidden' ? 'Show listing' : 'Hide listing'}</button>
                  )}
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => setDeleteConfirmId(isDeleting ? null : a.id)}>Delete</button>
                </div>
                {isDeleting && (
                  <div style={{ padding: '0 20px 14px' }}>
                    <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <p style={{ fontSize: 13, color: '#A32D2D' }}>Permanently delete this listing?</p>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                        <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => onDelete(a.id)}>Yes</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />

      {/* Edit modal */}
      {editingArtwork && (
        <EditModal
          artwork={editingArtwork}
          onSave={updates => { onSaveEdit(editingArtwork.id, updates); setEditingArtwork(null) }}
          onCancel={() => setEditingArtwork(null)}
        />
      )}

      {/* QR modal */}
      {qrArtwork && <QRModal artwork={qrArtwork} profile={profile} onClose={() => setQrArtwork(null)} />}
    </div>
  )
}

// ── Edit artwork form ─────────────────────────────────────────────────────
function EditArtworkForm({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const CATEGORIES = [
    'Photography', 'Fine Art', 'Abstract', 'Illustration',
    'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
  ]

  const { papers, loading: papersLoading, getPapersByCategory, getDefaultPaper } = usePapers()

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
    reader.onload = ev => setPreviewThumb(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleNewGallerySelect(slotIndex: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = file; setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = ev.target?.result as string
      setGalleryThumbs(newThumbs)
    }
    reader.readAsDataURL(file)
  }

  function clearNewGallerySlot(slotIndex: number) {
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = null; setGalleryFiles(newFiles)
    const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = null; setGalleryThumbs(newThumbs)
  }

  function stageDeleteGalleryImage(img: any) {
    setDeletedGalleryIds(prev => [...prev, img.id])
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
    <div>
      {/* Images */}
      <div className="form-group">
        <label className="form-label">Images</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 6 }}>
          <div
            onClick={() => document.getElementById('edit-preview-' + artwork.id)?.click()}
            style={{ aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {previewThumb
              ? <img src={previewThumb} alt="main" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
              : <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}><div style={{ fontSize: 22, marginBottom: 2 }}>+</div><p style={{ fontSize: 10 }}>Tap to upload</p></div>
            }
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 20, pointerEvents: 'none' }}>
              {previewFile ? '✓ Changed' : 'Main'}
            </div>
            {previewThumb && (
              <button onClick={e => { e.stopPropagation(); setPreviewFile(null); setPreviewThumb(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            )}
            <input type="file" id={'edit-preview-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={handlePreviewSelect} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(i => {
              const existingImg = visibleGallery[i]
              const newThumb    = visibleGallery.length <= i ? galleryThumbs[i - visibleGallery.length] : null
              const thumbSrc    = existingImg ? existingImg.url : newThumb
              const isExisting  = !!existingImg
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <div
                    onClick={() => { if (!thumbSrc) document.getElementById('edit-gallery-' + artwork.id + '-' + i)?.click() }}
                    style={{ aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {thumbSrc ? <img src={thumbSrc} alt={'g' + i} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} /> : <span style={{ fontSize: 16, color: 'var(--color-border)' }}>+</span>}
                  </div>
                  {thumbSrc && (
                    <button
                      onClick={e => { e.stopPropagation(); if (isExisting) stageDeleteGalleryImage(existingImg); else clearNewGallerySlot(i - visibleGallery.length) }}
                      style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: isExisting ? 'rgba(163,45,45,0.85)' : 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >×</button>
                  )}
                  <input type="file" id={'edit-gallery-' + artwork.id + '-' + i} accept="image/*" style={{ display: 'none' }} onChange={e => handleNewGallerySelect(i - visibleGallery.length < 0 ? 0 : i - visibleGallery.length, e.target.files?.[0] || null)} />
                </div>
              )
            })}
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Tap main to replace · red × removes on save</p>
      </div>

      {/* Hi-res */}
      <div className="form-group">
        <label className="form-label">Hi-res print file</label>
        <div style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {hiresFile ? hiresFile.name : artwork.hires_path || 'No file'}
            </p>
          </div>
          <button onClick={() => document.getElementById('edit-hires-' + artwork.id)?.click()} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0 }}>
            {hiresFile ? 'Change' : 'Replace'}
          </button>
        </div>
        <input type="file" id={'edit-hires-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>A4 min 2339×1654px · A3 min 3307×2339px</p>
      </div>

      <Divider />

      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 70 }} />
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

      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Paper type</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>All prints use Hahnemühle archival papers.</p>
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
                  const isSelected   = effectivePaperType === paper.name
                  const addOnA4      = paper.addOn['A4'] || 0
                  const addOnA3      = paper.addOn['A3'] || 0
                  const hasPremium   = addOnA4 > 0 || addOnA3 > 0
                  const isOutOfStock = !paper.in_stock
                  const isRecommended = bestForKey && paper.best_for?.includes(bestForKey)
                  return (
                    <div
                      key={paper.name}
                      onClick={() => !isOutOfStock && setPaperType(paper.name)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: isSelected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)', borderRadius: 10, cursor: isOutOfStock ? 'not-allowed' : 'pointer', opacity: isOutOfStock ? 0.45 : 1 }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{paper.name}</p>
                          {isRecommended && !isOutOfStock && <span style={{ fontSize: 10, background: '#185FA5', color: '#fff', padding: '1px 8px', borderRadius: 20 }}>✓ Recommended</span>}
                          {isOutOfStock && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20 }}>Out of stock</span>}
                          {!hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 20 }}>Included</span>}
                          {hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 8px', borderRadius: 20 }}>+{formatMVR(addOnA4)} A4 · +{formatMVR(addOnA3)} A3</span>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); setDetailPaper(paper) }} style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', textDecoration: 'underline' }}>View details</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Divider />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold.</p>
          </div>
          <div onClick={() => setIsLimited(v => !v)} style={{ width: 44, height: 26, borderRadius: 13, background: isLimited ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: isLimited ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </div>
        {isLimited && (
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
            {artwork.edition_size && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span>Size: <strong style={{ color: 'var(--color-text)' }}>{artwork.edition_size}</strong></span>
                <span>Sold: <strong style={{ color: 'var(--color-text)' }}>{artwork.editions_sold || 0}</strong></span>
                <span>Left: <strong style={{ color: artwork.edition_size - (artwork.editions_sold || 0) === 0 ? '#A32D2D' : '#1D9E75' }}>{artwork.edition_size - (artwork.editions_sold || 0)}</strong></span>
              </div>
            )}
            <label className="form-label" style={{ marginBottom: 6 }}>Edition size</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input className="form-input" type="number" min={artwork.editions_sold || 1} max="999" value={editionSize} onChange={e => setEditionSize(e.target.value)} style={{ maxWidth: 100 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, flex: 1 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={onCancel} disabled={saving}>Cancel</button>
      </div>

      {detailPaper && <PaperDetailModal paper={detailPaper} onClose={() => setDetailPaper(null)} />}
    </div>
  )
}
