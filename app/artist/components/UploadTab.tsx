'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers } from '@/lib/usePapers'
import { PaperDetailModal } from './PaperDetailModal'
import toast from 'react-hot-toast'

const PLATFORM_FEE = 5
const CATEGORIES = [
  'Photography', 'Fine Art', 'Abstract', 'Illustration',
  'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
]

async function validateHiRes(file: File, sizes: string[]): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const long = Math.max(w, h), short = Math.min(w, h)
      if (sizes.includes('A3')) {
        if (long < 3307 || short < 2339) { resolve('For A3, image must be at least 3307 × 2339 px. Yours is ' + w + ' × ' + h + ' px.'); return }
      } else if (sizes.includes('A4')) {
        if (long < 2339 || short < 1654) { resolve('For A4, image must be at least 2339 × 1654 px. Yours is ' + w + ' × ' + h + ' px.'); return }
      }
      resolve(null)
    }
    img.onerror = () => resolve('Could not read image. Please upload a JPG or PNG.')
    img.src = URL.createObjectURL(file)
  })
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{children}</p>
      {hint && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{hint}</p>}
    </div>
  )
}

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '24px 0' }} />
}

export function UploadTab({ profile, nextSeq, onSuccess }: any) {
  const { papers, loading: papersLoading, getPapersByCategory, getPaperAddOn, getDefaultPaper } = usePapers()

  const [form, setForm] = useState({
    title:       '',
    description: '',
    price:       '',
    category:    'Photography',
    paintingBy:  '',
  })
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['A4', 'A3'])
  const [paperType, setPaperType]         = useState<string>('')
  const [isLimited, setIsLimited]         = useState(false)
  const [editionSize, setEditionSize]     = useState<string>('50')
  const [hiresFile, setHiresFile]         = useState<File | null>(null)
  const [previewFile, setPreviewFile]     = useState<File | null>(null)
  const [previewThumb, setPreviewThumb]   = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles]   = useState<(File | null)[]>([null, null, null])
  const [galleryThumbs, setGalleryThumbs] = useState<(string | null)[]>([null, null, null])
  const [activeThumb, setActiveThumb]     = useState<number>(0)
  const [uploading, setUploading]         = useState(false)
  const [detailPaper, setDetailPaper]     = useState<any>(null)

  const effectivePaperType = paperType || getDefaultPaper()
  const nextSku            = 'FP-' + profile?.artist_code + '-' + String(nextSeq).padStart(3, '0')
  const price              = parseInt(form.price) || 0
  const platformFeeAmt     = Math.round(price * PLATFORM_FEE / 100)
  const artistEarns        = price - platformFeeAmt
  const papersByCategory   = getPapersByCategory()
  const selectedPaper      = papers.find(p => p.name === effectivePaperType)

  function toggleSize(size: string) {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  function handlePreviewSelect(file: File | null) {
    setPreviewFile(file)
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => { setPreviewThumb(ev.target?.result as string); setActiveThumb(0) }
      reader.readAsDataURL(file)
    }
  }

  function clearPreview() { setPreviewFile(null); setPreviewThumb(null); setActiveThumb(0) }

  function handleGallerySelect(index: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]; newFiles[index] = file; setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...galleryThumbs]; newThumbs[index] = ev.target?.result as string
      setGalleryThumbs(newThumbs); setActiveThumb(index + 1)
    }
    reader.readAsDataURL(file)
  }

  function clearGallerySlot(index: number) {
    const newFiles  = [...galleryFiles];  newFiles[index]  = null; setGalleryFiles(newFiles)
    const newThumbs = [...galleryThumbs]; newThumbs[index] = null; setGalleryThumbs(newThumbs)
    if (activeThumb === index + 1) setActiveThumb(0)
  }

  const bigImage = activeThumb === 0 ? previewThumb : galleryThumbs[activeThumb - 1]

  async function handleUpload() {
    if (!form.title)                        { toast.error('Please fill in the title'); return }
    if (!form.price || price < 1)           { toast.error('Please set a price'); return }
    if (selectedSizes.length === 0)         { toast.error('Please select at least one print size'); return }
    if (!hiresFile)                         { toast.error('Please upload your hi-res print file'); return }
    if (!previewFile)                       { toast.error('Please upload a preview image'); return }
    if (isLimited && (!editionSize || parseInt(editionSize) < 1)) { toast.error('Please set a valid edition size'); return }

    const dimError = await validateHiRes(hiresFile, selectedSizes)
    if (dimError) { toast.error(dimError); return }

    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: prof } = await supabase.from('profiles').select('artist_code, full_name').eq('id', user.id).single()
      if (!prof?.artist_code) throw new Error('Artist code not found — contact support')

      const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', user.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const sku = 'FP-' + prof.artist_code + '-' + seq

      toast.loading('Uploading hi-res file...', { id: 'upload' })
      const hiresExt  = hiresFile.name.split('.').pop()
      const hiresPath = sku + '-hires.' + hiresExt
      const { error: hiresError } = await supabase.storage.from('artwork-hires').upload(hiresPath, hiresFile, { contentType: hiresFile.type })
      if (hiresError) throw hiresError

      toast.loading('Uploading preview...', { id: 'upload' })
      const previewExt  = previewFile.name.split('.').pop()
      const previewPath = sku + '-preview.' + previewExt
      const { error: previewError } = await supabase.storage.from('artwork-previews').upload(previewPath, previewFile, { contentType: previewFile.type })
      if (previewError) throw previewError

      const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)

      toast.loading('Saving listing...', { id: 'upload' })
      const { data: artwork, error: dbError } = await supabase.from('artworks').insert({
        sku,
        artist_id:     user.id,
        title:         form.title,
        description:   form.description,
        price,
        hires_path:    hiresPath,
        preview_url:   urlData.publicUrl,
        sizes:         selectedSizes,
        status:        'pending',
        category:      form.category,
        painting_by:   form.paintingBy || null,
        paper_type:    effectivePaperType,
        edition_size:  isLimited ? parseInt(editionSize) : null,
        editions_sold: 0,
      }).select().single()
      if (dbError) throw dbError

      if (galleryFiles.some(Boolean) && artwork) {
        toast.loading('Uploading gallery...', { id: 'upload' })
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i]
          if (!gFile) continue
          const gExt  = gFile.name.split('.').pop()
          const gPath = 'gallery/' + sku + '-gallery-' + (i + 1) + '.' + gExt
          const { error: gError } = await supabase.storage.from('artwork-previews').upload(gPath, gFile, { contentType: gFile.type })
          if (gError) { console.error(gError); continue }
          const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
          await supabase.from('artwork_images').insert({ artwork_id: artwork.id, url: gUrl.publicUrl, sort_order: i + 1 })
        }
      }

      await fetch('/api/notify/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, title: form.title, artistName: prof.full_name, price, sizes: selectedSizes }),
      })

      toast.success('Submitted for review · SKU: ' + sku, { id: 'upload' })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, { id: 'upload' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>Upload new artwork</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Upload your hi-res print file and a watermarked preview for buyers.
      </p>

      {/* ── HI-RES FILE ───────────────────────────────────────── */}
      <SectionLabel hint="Private — only used for printing. Never shown to buyers.">Hi-res print file</SectionLabel>
      <div style={{ marginBottom: 4 }}>
        <div
          style={{ border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          onClick={() => !hiresFile && document.getElementById('hires-input')?.click()}
        >
          <span style={{ fontSize: 20 }}>🖨</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {hiresFile ? hiresFile.name : 'Tap to upload hi-res file'}
            </p>
            {hiresFile && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{(hiresFile.size / 1024 / 1024).toFixed(1)} MB</p>}
          </div>
          {hiresFile && (
            <button
              onClick={e => { e.stopPropagation(); setHiresFile(null); (document.getElementById('hires-input') as HTMLInputElement).value = '' }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          )}
        </div>
        {hiresFile && (
          <button
            onClick={() => document.getElementById('hires-input')?.click()}
            style={{ fontSize: 11, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'block' }}
          >
            Change file
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        JPG or PNG · A4 min 2339 × 1654 px · A3 min 3307 × 2339 px · up to 35 MB
      </p>
      <input type="file" id="hires-input" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />

      {/* ── PREVIEW IMAGES ────────────────────────────────────── */}
      <SectionLabel hint="Shown to buyers — add your watermark before uploading.">Preview image</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 6 }}>
        <div
          onClick={() => !bigImage && document.getElementById('preview-input')?.click()}
          style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: bigImage ? 'default' : 'pointer' }}
        >
          {bigImage ? (
            <>
              <img src={bigImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
              {activeThumb === 0 && (
                <>
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 20, pointerEvents: 'none' }}>Main</div>
                  <button onClick={e => { e.stopPropagation(); clearPreview() }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </>
              )}
              {activeThumb > 0 && galleryThumbs[activeThumb - 1] && (
                <button onClick={e => { e.stopPropagation(); clearGallerySlot(activeThumb - 1) }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
              <p style={{ fontSize: 11 }}>Tap to upload main preview</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => {
            const thumb    = galleryThumbs[i]
            const isActive = activeThumb === i + 1
            return (
              <div key={i} style={{ position: 'relative', flex: 1 }}>
                <div
                  onClick={() => { if (thumb) setActiveThumb(i + 1); else document.getElementById('gallery-input-' + i)?.click() }}
                  style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: isActive ? '2px solid #1a1a1a' : thumb ? '0.5px solid var(--color-border)' : '0.5px dashed var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}
                >
                  {thumb
                    ? <img src={thumb} alt={'g' + i} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                    : <span style={{ fontSize: 16, color: 'var(--color-border)' }}>+</span>
                  }
                </div>
                {thumb && (
                  <button onClick={() => clearGallerySlot(i)}
                    style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                )}
                <input type="file" id={'gallery-input-' + i} accept="image/*" style={{ display: 'none' }} onChange={e => handleGallerySelect(i, e.target.files?.[0] || null)} />
              </div>
            )
          })}
        </div>
      </div>
      <input type="file" id="preview-input" accept="image/*" style={{ display: 'none' }} onChange={e => handlePreviewSelect(e.target.files?.[0] || null)} />

      <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          💡 Artworks with room mockups and close-up shots sell significantly better.
        </p>
      </div>

      <Divider />

      {/* ── ARTWORK DETAILS ───────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Name your artwork" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell buyers about this piece..." />
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">
          Painting by
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>optional</span>
        </label>
        <input className="form-input" value={form.paintingBy} onChange={e => setForm({ ...form, paintingBy: e.target.value })} placeholder="e.g. Ahmed Naif" />
      </div>

      <Divider />

      {/* ── PRINT SIZES ───────────────────────────────────────── */}
      <SectionLabel hint="Select the sizes you will offer for this artwork.">Print sizes</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { size: 'A4', dims: '210 × 297 mm', fee: PRINTING_FEES['A4'], comingSoon: false },
          { size: 'A3', dims: '297 × 420 mm', fee: PRINTING_FEES['A3'], comingSoon: false },
          { size: 'A2', dims: '420 × 594 mm', fee: 0,                   comingSoon: true  },
        ].map(({ size, dims, fee, comingSoon }) => (
          <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: comingSoon ? 'not-allowed' : 'pointer', padding: '10px 14px', border: '0.5px solid var(--color-border)', borderRadius: 10, background: selectedSizes.includes(size) && !comingSoon ? 'var(--color-surface)' : 'transparent', opacity: comingSoon ? 0.45 : 1 }}>
            <input type="checkbox" checked={!comingSoon && selectedSizes.includes(size)} onChange={() => !comingSoon && toggleSize(size)} disabled={comingSoon} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>
                {size}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12, marginLeft: 6 }}>({dims})</span>
                {comingSoon && <span style={{ fontSize: 10, marginLeft: 8, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Coming soon</span>}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {comingSoon ? 'Available soon' : 'Base printing fee: ' + formatMVR(fee)}
              </p>
            </div>
          </label>
        ))}
      </div>

      <Divider />

      {/* ── PAPER TYPE ────────────────────────────────────────── */}
      <SectionLabel hint="All prints are produced on Hahnemühle archival papers. The standard paper is included — upgrade for a premium feel.">
        Paper type
      </SectionLabel>
      <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          🖨 By default, all FinePrint Studio prints are produced on <strong>Hahnemühle museum-grade archival papers</strong> at no extra cost. If you have a specific preference for your artwork, select below.
        </p>
      </div>

      {papersLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Loading papers...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
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
                  return (
                    <div
                      key={paper.name}
                      onClick={() => !isOutOfStock && setPaperType(paper.name)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px',
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
        <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
            ℹ️ <strong>{selectedPaper.name}</strong> adds a paper upgrade fee to the buyer's total:
            {selectedSizes.includes('A4') && ` A4 +${formatMVR(selectedPaper.addOn['A4'])}`}
            {selectedSizes.includes('A3') && ` · A3 +${formatMVR(selectedPaper.addOn['A3'])}`}.
            This does not affect your earnings.
          </p>
        </div>
      )}

      <Divider />

      {/* ── PRICING ───────────────────────────────────────────── */}
      <SectionLabel hint="Set your artwork price. The printing fee and any paper add-on are added on top for buyers.">
        Your artwork price (MVR)
      </SectionLabel>
      <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 800" style={{ maxWidth: 160, marginBottom: 10 }} />

      {price > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 10 }}>Price breakdown</p>
          {selectedSizes.map(size => {
            const addOn   = getPaperAddOn(effectivePaperType, size)
            const baseFee = PRINTING_FEES[size] || 200
            const total   = price + baseFee + addOn + 100
            return (
              <div key={size} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  <span>{size} — Artwork</span><span>{formatMVR(price)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  <span>{size} — Printing</span><span>{formatMVR(baseFee)}</span>
                </div>
                {addOn > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#633806', marginBottom: 2 }}>
                    <span>{size} — Paper upgrade ({effectivePaperType})</span><span>+{formatMVR(addOn)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  <span>{size} — Delivery</span><span>{formatMVR(100)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', borderTop: '0.5px solid var(--color-border)', paddingTop: 6, marginTop: 4 }}>
                  <span>Buyer pays ({size})</span><span>{formatMVR(total)}</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: '#1D9E75', borderTop: '0.5px solid var(--color-border)', paddingTop: 10, marginTop: 6 }}>
            <span>You earn (after 5% fee)</span><span>{formatMVR(artistEarns)}</span>
          </div>
        </div>
      )}

      <Divider />

      {/* ── LIMITED EDITION ───────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold. Creates scarcity and value.</p>
          </div>
          <div
            onClick={() => setIsLimited(v => !v)}
            style={{ width: 44, height: 26, borderRadius: 13, background: isLimited ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, left: isLimited ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </div>
        {isLimited && (
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
            <label className="form-label" style={{ marginBottom: 6 }}>Edition size</label>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>
              How many prints total? Once this number of orders is approved, the artwork shows as sold out.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input className="form-input" type="number" min="1" max="999" value={editionSize} onChange={e => setEditionSize(e.target.value)} style={{ maxWidth: 100 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
            </div>
            <div style={{ marginTop: 12, padding: '10px 0 0', borderTop: '0.5px solid var(--color-border)' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                📦 When sold out, buyers see <strong>"Out of stock"</strong> and can register their email to be notified if you restock.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── SKU PREVIEW ───────────────────────────────────────── */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>{nextSku} next available</p>
      </div>

      <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>

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
