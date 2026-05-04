'use client'
import { useEffect, useState, useRef } from 'react'
import { formatMVR } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'
import { PaperDetailModal } from '@/app/artist/components/PaperDetailModal'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const APP_URL = 'https://shop.fineprintmv.com'

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '20px 0' }} />
}

// ── Series Modal ──────────────────────────────────────────────────────────
function SeriesModal({ artwork, onClose }: { artwork: any; onClose: () => void }) {
  const supabase = createClient()
  const [mode, setMode]                         = useState<'new' | 'existing'>('existing')
  const [existingSeries, setExistingSeries]     = useState<any[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [newSeriesName, setNewSeriesName]       = useState('')
  const [seriesLabel, setSeriesLabel]           = useState(artwork.series_label || '')
  const [isPrimary, setIsPrimary]               = useState(false)
  const [saving, setSaving]                     = useState(false)

  useEffect(function() {
    fetchSeries()
    if (artwork.series_id) setMode('existing')
  }, [])

  async function fetchSeries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('artwork_series')
      .select('id, name, primary_artwork_id')
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false })
    setExistingSeries(data || [])
    if (artwork.series_id) setSelectedSeriesId(artwork.series_id)
  }

  async function handleSave() {
    if (!seriesLabel.trim()) { toast.error('Please enter a variant label'); return }
    if (mode === 'new' && !newSeriesName.trim()) { toast.error('Please enter a series name'); return }
    if (mode === 'existing' && !selectedSeriesId) { toast.error('Please select a series'); return }
    setSaving(true)
    try {
      let seriesId = selectedSeriesId
      if (mode === 'new') {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: newSeries, error } = await supabase
          .from('artwork_series')
          .insert({ name: newSeriesName.trim(), artist_id: user!.id })
          .select()
          .single()
        if (error) throw error
        seriesId = newSeries.id
      }
      const { error: updateError } = await supabase
        .from('artworks')
        .update({ series_id: seriesId, series_label: seriesLabel.trim() })
        .eq('id', artwork.id)
      if (updateError) throw updateError
      if (isPrimary) {
        await supabase
          .from('artwork_series')
          .update({ primary_artwork_id: artwork.id })
          .eq('id', seriesId)
      }
      toast.success('Series updated')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveFromSeries() {
    setSaving(true)
    try {
      await supabase.from('artworks').update({ series_id: null, series_label: null }).eq('id', artwork.id)
      toast.success('Removed from series')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={function(e) { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Series & variants — {artwork.title}</p>
          <button onClick={onClose} style={{ background: 'var(--color-background-secondary)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ padding: 20 }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={function() { setMode('existing') }} className="btn"
              style={mode === 'existing' ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)', fontSize: 12 } : { fontSize: 12 }}>
              Existing series
            </button>
            <button onClick={function() { setMode('new') }} className="btn"
              style={mode === 'new' ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)', fontSize: 12 } : { fontSize: 12 }}>
              Create new series
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="form-group">
              <label className="form-label">Select series</label>
              {existingSeries.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No series yet. Create one first.</p>
              ) : (
                <select className="form-input" value={selectedSeriesId} onChange={function(e) { setSelectedSeriesId(e.target.value) }}>
                  <option value="">— choose a series —</option>
                  {existingSeries.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option> })}
                </select>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Series name</label>
              <input className="form-input" value={newSeriesName} onChange={function(e) { setNewSeriesName(e.target.value) }} placeholder="e.g. Eiffel Tower, Maldives Sunsets" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Variant label</label>
            <input className="form-input" value={seriesLabel} onChange={function(e) { setSeriesLabel(e.target.value) }} placeholder="e.g. Sunset, Blue, Version 1" />
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>What buyers see when choosing between variants.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '0.5px solid var(--color-border)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Show on storefront</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Make this the primary variant shown on the storefront grid.</p>
            </div>
            <div onClick={function() { setIsPrimary(function(v) { return !v }) }}
              style={{ width: 44, height: 26, borderRadius: 13, background: isPrimary ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ position: 'absolute', top: 3, left: isPrimary ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {artwork.series_id && (
              <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={handleRemoveFromSeries} disabled={saving}>
                Remove from series
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyListings({ onUpload }: { onUpload: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px 48px', maxWidth: 480, margin: '0 auto' }}>
      <style>{`
        @property --gradient-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @property --gradient-angle-offset { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @property --gradient-percent { syntax: "<percentage>"; initial-value: 5%; inherits: false; }
        @property --gradient-shine { syntax: "<color>"; initial-value: white; inherits: false; }
        .fp-shiny-cta {
          --shiny-bg: #0a1f1c; --shiny-bg-subtle: #0f2e28; --shiny-fg: #ffffff;
          --shiny-highlight: #1D9E75; --shiny-highlight-subtle: #5DCAA5;
          --animation: gradient-angle linear infinite; --duration: 3s; --shadow-size: 2px;
          isolation: isolate; position: relative; overflow: hidden; cursor: pointer;
          outline-offset: 4px; padding: 1rem 2.5rem; font-family: inherit;
          font-size: 1rem; font-weight: 500; line-height: 1.2;
          border: 1px solid transparent; border-radius: 360px; color: var(--shiny-fg);
          background:
            linear-gradient(var(--shiny-bg), var(--shiny-bg)) padding-box,
            conic-gradient(
              from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
              transparent, var(--shiny-highlight) var(--gradient-percent),
              var(--gradient-shine) calc(var(--gradient-percent) * 2),
              var(--shiny-highlight) calc(var(--gradient-percent) * 3),
              transparent calc(var(--gradient-percent) * 4)
            ) border-box;
          box-shadow: inset 0 0 0 1px var(--shiny-bg-subtle);
          --transition: 800ms cubic-bezier(0.25, 1, 0.5, 1);
          transition: var(--transition);
          transition-property: --gradient-angle-offset, --gradient-percent, --gradient-shine;
        }
        .fp-shiny-cta::before, .fp-shiny-cta::after, .fp-shiny-cta span::before { content: ""; pointer-events: none; position: absolute; inset-inline-start: 50%; inset-block-start: 50%; translate: -50% -50%; z-index: -1; }
        .fp-shiny-cta::before { --size: calc(100% - var(--shadow-size) * 3); --position: 2px; --space: calc(var(--position) * 2); width: var(--size); height: var(--size); background: radial-gradient(circle at var(--position) var(--position), white calc(var(--position) / 4), transparent 0) padding-box; background-size: var(--space) var(--space); background-repeat: space; mask-image: conic-gradient(from calc(var(--gradient-angle) + 45deg), black, transparent 10% 90%, black); border-radius: inherit; opacity: 0.4; z-index: -1; }
        .fp-shiny-cta::after { --animation: shimmer-fp linear infinite; width: 100%; aspect-ratio: 1; background: linear-gradient(-50deg, transparent, var(--shiny-highlight), transparent); mask-image: radial-gradient(circle at bottom, transparent 40%, black); opacity: 0.6; }
        .fp-shiny-cta span { z-index: 1; }
        .fp-shiny-cta span::before { --size: calc(100% + 1rem); width: var(--size); height: var(--size); box-shadow: inset 0 -1ex 2rem 4px var(--shiny-highlight); opacity: 0; }
        .fp-shiny-cta, .fp-shiny-cta::before, .fp-shiny-cta::after { animation: var(--animation) var(--duration), var(--animation) calc(var(--duration) / 0.4) reverse paused; animation-composition: add; }
        .fp-shiny-cta span::before { transition: opacity var(--transition); animation: calc(var(--duration) * 1.5) breathe-fp linear infinite; }
        .fp-shiny-cta:hover, .fp-shiny-cta:focus-visible { --gradient-percent: 20%; --gradient-angle-offset: 95deg; --gradient-shine: var(--shiny-highlight-subtle); }
        .fp-shiny-cta:hover, .fp-shiny-cta:focus-visible, .fp-shiny-cta:hover::before, .fp-shiny-cta:focus-visible::before, .fp-shiny-cta:hover::after, .fp-shiny-cta:focus-visible::after { animation-play-state: running; }
        .fp-shiny-cta:hover span::before, .fp-shiny-cta:focus-visible span::before { opacity: 1; }
        .fp-shiny-cta:active { translate: 0 1px; }
        @keyframes gradient-angle { to { --gradient-angle: 360deg; } }
        @keyframes shimmer-fp { to { rotate: 360deg; } }
        @keyframes breathe-fp { from, to { scale: 1; } 50% { scale: 1.2; } }
      `}</style>
      <div style={{ fontSize: 64, marginBottom: 28, filter: 'drop-shadow(0 4px 16px rgba(29,158,117,0.2))' }}>🎨</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--color-text-primary)' }}>Start selling your art</h2>
      <p style={{ fontSize: 15, color: 'var(--color-text-muted)', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>Your prints, professionally made and delivered across the Maldives. Upload once, sell forever.</p>
      <button className="fp-shiny-cta" onClick={onUpload}><span>Upload your first artwork</span></button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginTop: 40, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: '55%', height: '0.5px', background: 'var(--color-border)', zIndex: 0 }} />
        {[{ step: '1', label: 'Upload', sub: 'Hi-res + preview' }, { step: '2', label: 'We review', sub: 'Within 24 hours' }, { step: '3', label: 'Go live', sub: 'Instant on store' }].map(function(item) {
          return (
            <div key={item.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: '3px solid var(--color-background-primary)' }}>{item.step}</div>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px', color: 'var(--color-text-primary)' }}>{item.label}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{item.sub}</p>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span>🔒</span> Your hi-res files are never shown to buyers
      </p>
    </div>
  )
}

// ── QR Modal ─────────────────────────────────────────────────────────────
function QRModal({ artwork, profile, onClose }: { artwork: any, profile: any, onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [qrDataUrl, setQrDataUrl]     = useState<string | null>(null)
  const url = APP_URL + '/artwork/' + artwork.id

  useEffect(function() {
    async function renderQR() {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
    }
    renderQR()
  }, [url])

  async function downloadPDF() {
    if (!qrDataUrl) return
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' })
      const W = 105, H = 148, cx = W / 2
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, W, H, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(10, 10, 10)
      const titleLines = doc.splitTextToSize(artwork.title || 'Untitled', 80).slice(0, 2)
      doc.text(titleLines, cx, 20, { align: 'center', lineHeightFactor: 1.3 })
      let y = 20 + titleLines.length * 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(130, 130, 130)
      doc.text(profile?.display_name || profile?.full_name || '', cx, y + 4, { align: 'center' })
      y += 10
      doc.setFont('courier', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(180, 178, 175)
      doc.text(artwork.sku || '', cx, y + 2, { align: 'center' })
      y += 7
      doc.setDrawColor(225, 225, 225)
      doc.setLineWidth(0.2)
      doc.line(18, y + 2, W - 18, y + 2)
      y += 8
      const qrSize = 56
      doc.addImage(qrDataUrl, 'PNG', (W - qrSize) / 2, y, qrSize, qrSize)
      y += qrSize + 6
      doc.line(18, y, W - 18, y)
      y += 5
      doc.setFontSize(6.5)
      doc.setTextColor(185, 183, 180)
      doc.text('scan to own this print', cx, y, { align: 'center' })
      y += 6
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise(function(res, rej) { logoImg.onload = res; logoImg.onerror = rej; logoImg.src = '/Asset 1fineprint_long.png' })
        const logoW = 28, logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW
        const canvas = document.createElement('canvas')
        canvas.width = logoImg.naturalWidth; canvas.height = logoImg.naturalHeight
        canvas.getContext('2d')!.drawImage(logoImg, 0, 0)
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', (W - logoW) / 2, y, logoW, logoH)
      } catch {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(26, 26, 26)
        doc.text('fineprintstudio', cx, y + 4, { align: 'center' })
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
    <div onClick={function(e) { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a', flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>QR card — {artwork.title}</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff', cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #e8e8e8', maxWidth: 220, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 3px', lineHeight: 1.3 }}>{artwork.title}</p>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px' }}>{profile?.display_name || profile?.full_name}</p>
                <p style={{ fontSize: 9, color: '#bbb', fontFamily: 'monospace', margin: 0 }}>{artwork.sku}</p>
              </div>
              <div style={{ width: '100%', height: '0.5px', background: '#eee' }} />
              <div style={{ background: '#fff', borderRadius: 8, padding: 4, border: '0.5px solid #eee' }}>
                {qrDataUrl ? <img src={qrDataUrl} alt="QR" style={{ display: 'block', width: 120, height: 120 }} /> : <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: 11 }}>Loading…</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 8, color: '#bbb', margin: '0 0 5px' }}>scan to own this print</p>
                <img src="/Asset 1fineprint_long.png" alt="FinePrint Studio" style={{ height: 13, width: 'auto', opacity: 0.75 }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 10, wordBreak: 'break-all' }}>{url}</p>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>Print this A6 card and place it next to your artwork in galleries, cafes, or hotels.</p>
          </div>
          <button onClick={downloadPDF} disabled={downloading || !qrDataUrl} style={{ width: '100%', marginTop: 14, padding: '13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: (downloading || !qrDataUrl) ? 'not-allowed' : 'pointer', opacity: (downloading || !qrDataUrl) ? 0.7 : 1 }}>
            {downloading ? 'Generating PDF...' : !qrDataUrl ? 'Loading QR...' : 'Download A6 PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────
function EditModal({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  return (
    <div onClick={function(e) { if (e.target === e.currentTarget) onCancel() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}>
      <div style={{ position: 'fixed', zIndex: 301, background: 'var(--color-background-primary)', overflowY: 'auto', bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', maxHeight: '92dvh' }} className="edit-modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
        </div>
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
          .edit-modal-sheet { top: 50% !important; left: 50% !important; right: auto !important; bottom: auto !important; transform: translate(-50%, -50%); width: 100%; max-width: 560px; border-radius: 16px !important; max-height: 90vh !important; }
        }
      `}</style>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function ArtistListingsTab({ artworks, profile, editingArtwork, deleteConfirmId, setEditingArtwork, setDeleteConfirmId, onToggleHide, onDelete, onSaveEdit, onUpload }: any) {
  const [search, setSearch]         = useState('')
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid')
  const [qrArtwork, setQrArtwork]   = useState<any>(null)
  const [seriesArtwork, setSeriesArtwork] = useState<any>(null)

  const filtered = artworks.filter(function(a: any) {
    return !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.sku?.toLowerCase().includes(search.toLowerCase()) ||
      a.category?.toLowerCase().includes(search.toLowerCase())
  })

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filtered, viewMode === 'grid' ? 12 : PAGE_SIZES.listings)

  if (artworks.length === 0 && !search) return <EmptyListings onUpload={onUpload} />

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search listings..." value={search} onChange={function(e) { setSearch(e.target.value) }} style={{ flex: 1, fontSize: 13 }} />
        {search && <button className="btn btn-sm" onClick={function() { setSearch('') }}>Clear x</button>}
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={function() { setViewMode('grid') }} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'grid' ? '#1a1a1a' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)' }}>Grid</button>
          <button onClick={function() { setViewMode('list') }} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'list' ? '#1a1a1a' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)' }}>List</button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ gridColumn: '1/-1', padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No listings match your search.</p>
          ) : paginated.map(function(a: any) {
            const remaining  = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            const isDeleting = deleteConfirmId === a.id
            return (
              <div key={a.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '1/1', background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                  {a.preview_url
                    ? <img src={a.preview_url} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: a.status === 'hidden' ? 0.4 : 1 }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 24 }}>🖼</div>
                  }
                  <span className={'badge badge-' + a.status} style={{ position: 'absolute', top: 6, left: 6, fontSize: 9 }}>{a.status}</span>
                  {remaining === 0 && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, background: '#FCEBEB', color: '#A32D2D', padding: '1px 6px', borderRadius: 20 }}>Sold out</span>}
                </div>
                <div style={{ padding: '8px 10px 4px', flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 3px' }}>{formatMVR(a.price)}</p>
                  <span className="sku-tag" style={{ fontSize: 9 }}>{a.sku}</span>
                  {/* Series badge */}
                  {a.series_label && (
                    <span style={{ display: 'inline-block', marginLeft: 4, fontSize: 9, background: '#E6F1FB', color: '#185FA5', padding: '1px 6px', borderRadius: 20 }}>
                      {a.series_label}
                    </span>
                  )}
                </div>
                <div style={{ padding: '6px 10px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={function() { setEditingArtwork(a) }}>Edit</button>
                  <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={function() { setQrArtwork(a) }}>QR</button>
                  <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px', background: a.series_id ? '#E6F1FB' : 'transparent', color: a.series_id ? '#185FA5' : 'var(--color-text-muted)', border: a.series_id ? 'none' : '0.5px solid var(--color-border)' }} onClick={function() { setSeriesArtwork(a) }}>
                    {a.series_id ? 'Series' : '+ Series'}
                  </button>
                  {a.status !== 'pending' && (
                    <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px', background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'transparent', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: a.status === 'hidden' ? 'none' : '0.5px solid var(--color-border)' }} onClick={function() { onToggleHide(a) }}>
                      {a.status === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '3px 8px' }} onClick={function() { setDeleteConfirmId(isDeleting ? null : a.id) }}>Del</button>
                </div>
                {isDeleting && (
                  <div style={{ margin: '0 10px 10px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8 }}>Delete permanently?</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={function() { setDeleteConfirmId(null) }}>Cancel</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: 10 }} onClick={function() { onDelete(a.id) }}>Yes</button>
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
            <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>No listings match your search.</p>
          ) : paginated.map(function(a: any) {
            const isDeleting = deleteConfirmId === a.id
            const remaining  = a.edition_size ? a.edition_size - (a.editions_sold || 0) : null
            return (
              <div key={a.id} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                  {a.preview_url && <img src={a.preview_url} alt={a.title} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, opacity: a.status === 'hidden' ? 0.4 : 1 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="sku-tag">{a.sku}</span>
                      <span className={'badge badge-' + a.status}>{a.status}</span>
                      {a.series_label && <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '1px 7px', borderRadius: 20 }}>{a.series_label}</span>}
                      {a.paper_type && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>{a.paper_type}</span>}
                      {a.edition_size && <span style={{ fontSize: 10, background: remaining === 0 ? '#FCEBEB' : '#f0f0ec', color: remaining === 0 ? '#A32D2D' : 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>{remaining === 0 ? 'Sold out' : remaining + ' left'}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(a.price)}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>earnings</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={function() { setEditingArtwork(a) }}>Edit</button>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={function() { setQrArtwork(a) }}>QR card</button>
                  <button className="btn btn-sm" style={{ fontSize: 11, background: a.series_id ? '#E6F1FB' : 'var(--color-background-secondary)', color: a.series_id ? '#185FA5' : 'var(--color-text-muted)', border: 'none' }} onClick={function() { setSeriesArtwork(a) }}>
                    {a.series_id ? 'Edit series' : 'Add to series'}
                  </button>
                  {a.status !== 'pending' && (
                    <button className="btn btn-sm" style={{ fontSize: 11, background: a.status === 'hidden' ? 'var(--color-teal-light)' : 'var(--color-background-secondary)', color: a.status === 'hidden' ? 'var(--color-teal-dark)' : 'var(--color-text-muted)', border: 'none' }} onClick={function() { onToggleHide(a) }}>
                      {a.status === 'hidden' ? 'Show listing' : 'Hide listing'}
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={function() { setDeleteConfirmId(isDeleting ? null : a.id) }}>Delete</button>
                </div>
                {isDeleting && (
                  <div style={{ padding: '0 20px 14px' }}>
                    <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <p style={{ fontSize: 13, color: '#A32D2D' }}>Permanently delete this listing?</p>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={function() { setDeleteConfirmId(null) }}>Cancel</button>
                        <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={function() { onDelete(a.id) }}>Yes</button>
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

      {editingArtwork && (
        <EditModal
          artwork={editingArtwork}
          onSave={function(updates: any) { onSaveEdit(editingArtwork.id, updates); setEditingArtwork(null) }}
          onCancel={function() { setEditingArtwork(null) }}
        />
      )}

      {qrArtwork && <QRModal artwork={qrArtwork} profile={profile} onClose={function() { setQrArtwork(null) }} />}
      {seriesArtwork && <SeriesModal artwork={seriesArtwork} onClose={function() { setSeriesArtwork(null) }} />}
    </div>
  )
}

// ── Edit artwork form ─────────────────────────────────────────────────────
function EditArtworkForm({ artwork, onSave, onCancel }: { artwork: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const CATEGORIES = ['Photography', 'Fine Art', 'Abstract', 'Illustration', 'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch']
  const { papers, loading: papersLoading, getPapersByCategory, getDefaultPaper } = usePapers()

  const [form, setForm] = useState({ title: artwork.title || '', description: artwork.description || '', price: String(artwork.price || ''), category: artwork.category || 'Photography', paintingBy: artwork.painting_by || '', sizes: artwork.sizes || ['A4', 'A3'] })
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
  const selectedPaper      = papers.find(function(p) { return p.name === effectivePaperType })
  const bestForKey         = CATEGORY_TO_BEST_FOR[form.category]

  useEffect(function() {
    async function loadGallery() {
      const { data } = await supabase.from('artwork_images').select('*').eq('artwork_id', artwork.id).order('sort_order', { ascending: true })
      setExistingGallery(data || [])
    }
    loadGallery()
  }, [artwork.id])

  const visibleGallery = existingGallery.filter(function(g) { return !deletedGalleryIds.includes(g.id) })

  function toggleSize(size: string) {
    setForm(function(prev) { return { ...prev, sizes: prev.sizes.includes(size) ? prev.sizes.filter(function(s: string) { return s !== size }) : [...prev.sizes, size] } })
  }

  function handlePreviewSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewFile(file)
    const reader = new FileReader()
    reader.onload = function(ev) { setPreviewThumb(ev.target?.result as string) }
    reader.readAsDataURL(file)
  }

  function handleNewGallerySelect(slotIndex: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = file; setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = function(ev) { const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = ev.target?.result as string; setGalleryThumbs(newThumbs) }
    reader.readAsDataURL(file)
  }

  function clearNewGallerySlot(slotIndex: number) {
    const newFiles = [...galleryFiles]; newFiles[slotIndex] = null; setGalleryFiles(newFiles)
    const newThumbs = [...galleryThumbs]; newThumbs[slotIndex] = null; setGalleryThumbs(newThumbs)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates: any = { title: form.title, description: form.description, price: parseInt(form.price) || artwork.price, category: form.category, painting_by: form.paintingBy || null, sizes: form.sizes, paper_type: effectivePaperType, edition_size: isLimited ? parseInt(editionSize) || null : null }
      for (const id of deletedGalleryIds) {
        const img = existingGallery.find(function(g) { return g.id === id })
        if (!img) continue
        await supabase.from('artwork_images').delete().eq('id', id)
        try { const url = new URL(img.url); const path = url.pathname.split('/artwork-previews/')[1]; if (path) await supabase.storage.from('artwork-previews').remove([decodeURIComponent(path)]) } catch {}
      }
      if (previewFile) {
        const ext = previewFile.name.split('.').pop()
        const path = artwork.sku + '-preview.' + ext
        const { error } = await supabase.storage.from('artwork-previews').upload(path, previewFile, { upsert: true, contentType: previewFile.type })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(path)
        updates.preview_url = urlData.publicUrl
      }
      if (hiresFile) {
        const ext = hiresFile.name.split('.').pop()
        const path = artwork.sku + '-hires.' + ext
        const { error } = await supabase.storage.from('artwork-hires').upload(path, hiresFile, { upsert: true, contentType: hiresFile.type })
        if (error) throw error
        updates.hires_path = path
      }
      if (galleryFiles.some(Boolean)) {
        const nextSort = visibleGallery.length + 1
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i]
          if (!gFile) continue
          const gExt = gFile.name.split('.').pop()
          const gPath = 'gallery/' + artwork.sku + '-gallery-' + Date.now() + '-' + i + '.' + gExt
          const { error: gErr } = await supabase.storage.from('artwork-previews').upload(gPath, gFile, { contentType: gFile.type })
          if (gErr) { console.error(gErr); continue }
          const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
          await supabase.from('artwork_images').insert({ artwork_id: artwork.id, url: gUrl.publicUrl, sort_order: nextSort + i })
        }
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
      <div className="form-group">
        <label className="form-label">Images</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 6 }}>
          <div onClick={function() { document.getElementById('edit-preview-' + artwork.id)?.click() }}
            style={{ aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {previewThumb ? <img src={previewThumb} alt="main" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} /> : <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}><div style={{ fontSize: 22, marginBottom: 2 }}>+</div><p style={{ fontSize: 10 }}>Tap to upload</p></div>}
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 20, pointerEvents: 'none' }}>{previewFile ? 'Changed' : 'Main'}</div>
            {previewThumb && <button onClick={function(e) { e.stopPropagation(); setPreviewFile(null); setPreviewThumb(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>}
            <input type="file" id={'edit-preview-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={handlePreviewSelect} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(function(i) {
              const existingImg = visibleGallery[i]
              const newThumb    = visibleGallery.length <= i ? galleryThumbs[i - visibleGallery.length] : null
              const thumbSrc    = existingImg ? existingImg.url : newThumb
              const isExisting  = !!existingImg
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <div onClick={function() { if (!thumbSrc) document.getElementById('edit-gallery-' + artwork.id + '-' + i)?.click() }}
                    style={{ aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {thumbSrc ? <img src={thumbSrc} alt={'g' + i} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} /> : <span style={{ fontSize: 16, color: 'var(--color-border)' }}>+</span>}
                  </div>
                  {thumbSrc && <button onClick={function(e) { e.stopPropagation(); if (isExisting) setDeletedGalleryIds(function(prev) { return [...prev, existingImg.id] }); else clearNewGallerySlot(i - visibleGallery.length) }} style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: isExisting ? 'rgba(163,45,45,0.85)' : 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>}
                  <input type="file" id={'edit-gallery-' + artwork.id + '-' + i} accept="image/*" style={{ display: 'none' }} onChange={function(e) { handleNewGallerySelect(i - visibleGallery.length < 0 ? 0 : i - visibleGallery.length, e.target.files?.[0] || null) }} />
                </div>
              )
            })}
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Tap main to replace</p>
      </div>

      <div className="form-group">
        <label className="form-label">Hi-res print file</label>
        <div style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{hiresFile ? hiresFile.name : artwork.hires_path || 'No file'}</p>
          </div>
          <button onClick={function() { document.getElementById('edit-hires-' + artwork.id)?.click() }} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0 }}>
            {hiresFile ? 'Change' : 'Replace'}
          </button>
        </div>
        <input type="file" id={'edit-hires-' + artwork.id} accept="image/*" style={{ display: 'none' }} onChange={function(e) { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />
      </div>

      <Divider />

      <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={function(e) { setForm({ ...form, title: e.target.value }) }} /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={function(e) { setForm({ ...form, description: e.target.value }) }} style={{ minHeight: 70 }} /></div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={function(e) { setForm({ ...form, category: e.target.value }); setPaperType('') }}>
          {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Painting by <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 11 }}>optional</span></label><input className="form-input" value={form.paintingBy} onChange={function(e) { setForm({ ...form, paintingBy: e.target.value }) }} placeholder="e.g. Ahmed Naif" /></div>
      <div className="form-group"><label className="form-label">Price (MVR)</label><input className="form-input" type="number" value={form.price} onChange={function(e) { setForm({ ...form, price: e.target.value }) }} style={{ maxWidth: 120 }} /></div>
      <div className="form-group">
        <label className="form-label">Available sizes</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['A4', 'A3'].map(function(size) {
            return <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.sizes.includes(size)} onChange={function() { toggleSize(size) }} />{size}</label>
          })}
        </div>
      </div>

      <Divider />

      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Paper type</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>All prints use Hahnemuhle archival papers.</p>
      </div>
      {papersLoading ? <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Loading papers...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {Object.entries(papersByCategory).map(function([category, categoryPapers]) {
            return (
              <div key={category}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 6, marginTop: 8 }}>{category}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(categoryPapers as any[]).map(function(paper) {
                    const isSelected = effectivePaperType === paper.name
                    const addOnA4 = paper.addOn['A4'] || 0, addOnA3 = paper.addOn['A3'] || 0
                    const hasPremium = addOnA4 > 0 || addOnA3 > 0
                    const isOutOfStock = !paper.in_stock
                    const isRecommended = bestForKey && paper.best_for?.includes(bestForKey)
                    return (
                      <div key={paper.name} onClick={function() { if (!isOutOfStock) setPaperType(paper.name) }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: isSelected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)', borderRadius: 10, cursor: isOutOfStock ? 'not-allowed' : 'pointer', opacity: isOutOfStock ? 0.45 : 1 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{paper.name}</p>
                            {isRecommended && !isOutOfStock && <span style={{ fontSize: 10, background: '#185FA5', color: '#fff', padding: '1px 8px', borderRadius: 20 }}>Recommended</span>}
                            {isOutOfStock && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20 }}>Out of stock</span>}
                            {!hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 20 }}>Included</span>}
                            {hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 8px', borderRadius: 20 }}>+{formatMVR(addOnA4)} A4</span>}
                          </div>
                          <button onClick={function(e) { e.stopPropagation(); setDetailPaper(paper) }} style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', textDecoration: 'underline' }}>View details</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Divider />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div><p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p><p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold.</p></div>
          <div onClick={function() { setIsLimited(function(v) { return !v }) }} style={{ width: 44, height: 26, borderRadius: 13, background: isLimited ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
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
              <input className="form-input" type="number" min={artwork.editions_sold || 1} max="999" value={editionSize} onChange={function(e) { setEditionSize(e.target.value) }} style={{ maxWidth: 100 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={onCancel} disabled={saving}>Cancel</button>
      </div>

      {detailPaper && <PaperDetailModal paper={detailPaper} onClose={function() { setDetailPaper(null) }} />}
    </div>
  )
}
