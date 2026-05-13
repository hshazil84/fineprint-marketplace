'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { PaperDetailModal } from './PaperDetailModal'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Photography', 'Fine Art', 'Abstract', 'Illustration',
  'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
]

const SIZES = [
  { size: 'A4', dims: '210 x 297 mm', comingSoon: false },
  { size: 'A3', dims: '297 x 420 mm', comingSoon: false },
  { size: 'A2', dims: '420 x 594 mm', comingSoon: true  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadType = 'single' | 'variant' | 'bundle'
type WizardStep = 'type' | 'series' | 'pieces' | 'piece-detail' | 'review'

interface PieceState {
  id:          string       // local uuid for tracking
  label:       string       // variant label or piece title
  artTitle:    string
  description: string
  price:       string
  sizes:       string[]
  paperType:   string
  isPrimary:   boolean
  isLimited:   boolean
  editionSize: string
  hiresFile:   File | null
  imageFiles:  (File | null)[]
  imageThumbs: (string | null)[]
  done:        boolean
  artworkId:   number | null  // set after submission
  sku:         string | null  // set after submission
}

interface Draft {
  id:                  string
  type:                UploadType
  series_name:         string
  category:            string
  bundle_price:        number | null
  individual_listings: boolean
  bundle_preview_url:  string | null
  pieces:              any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newPiece(overrides: Partial<PieceState> = {}): PieceState {
  return {
    id:          crypto.randomUUID(),
    label:       '',
    artTitle:    '',
    description: '',
    price:       '',
    sizes:       ['A4', 'A3'],
    paperType:   '',
    isPrimary:   false,
    isLimited:   false,
    editionSize: '50',
    hiresFile:   null,
    imageFiles:  [null, null, null],
    imageThumbs: [null, null, null],
    done:        false,
    artworkId:   null,
    sku:         null,
    ...overrides,
  }
}

async function validateHiRes(file: File, sizes: string[]): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const long = Math.max(w, h), short = Math.min(w, h)
      if (sizes.includes('A3')) {
        if (long < 3307 || short < 2339) {
          resolve(`For A3, image must be at least 3307 x 2339 px. Yours is ${w} x ${h} px.`)
          return
        }
      } else if (sizes.includes('A4')) {
        if (long < 2339 || short < 1654) {
          resolve(`For A4, image must be at least 2339 x 1654 px. Yours is ${w} x ${h} px.`)
          return
        }
      }
      resolve(null)
    }
    img.onerror = () => resolve('Could not read image. Please upload a JPG or PNG.')
    img.src = URL.createObjectURL(file)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '22px 0' }} />
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ width: 44, height: 26, borderRadius: 13, background: on ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function StepProgress({ step, type }: { step: WizardStep; type: UploadType }) {
  const steps: WizardStep[] = type === 'single'
    ? ['type', 'piece-detail', 'review']
    : ['type', 'series', 'pieces', 'review']
  const active = steps.indexOf(step === 'piece-detail' && type === 'single' ? 'piece-detail' : step)
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 22 }}>
      {steps.map((_, i) => (
        <div key={i} style={{
          height: 4, borderRadius: 2,
          width: i === active ? 28 : i < active ? 20 : 14,
          background: i <= active ? '#1a1a1a' : 'var(--color-border)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.4px' }}>{title}</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.5 }}>{sub}</p>
    </>
  )
}

function DraftBanner({ drafts, onResume, onDiscard }: {
  drafts: Draft[]
  onResume: (draft: Draft) => void
  onDiscard: (draftId: string) => void
}) {
  if (!drafts.length) return null
  return (
    <div style={{ marginBottom: 20 }}>
      {drafts.map(d => (
        <div key={d.id} style={{ background: '#EFF6FF', border: '0.5px solid #93C5FD', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer' }}
          onClick={() => onResume(d)}>
          <span style={{ fontSize: 18 }}>🕐</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#185FA5' }}>Unfinished upload</p>
            <p style={{ fontSize: 12, color: '#378ADD', marginTop: 2 }}>
              {d.series_name || 'Untitled'} · {d.type === 'single' ? 'Single' : d.type === 'variant' ? 'Variants' : 'Bundle'} · {d.pieces.filter((p: any) => p.submitted).length} of {d.pieces.length} done
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDiscard(d.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
}

// ─── Paper selector (reused in piece detail form) ─────────────────────────────

function PaperSelector({ value, onChange, category, onViewDetail }: {
  value: string
  onChange: (v: string) => void
  category: string
  onViewDetail: (paper: any) => void
}) {
  const { papers, loading, getPapersByCategory } = usePapers()
  const papersByCategory = getPapersByCategory()
  const bestForKey = CATEGORY_TO_BEST_FOR[category]

  if (loading) return <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Loading papers...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      {Object.entries(papersByCategory).map(([cat, categoryPapers]) => (
        <div key={cat}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 6, marginTop: 8 }}>{cat}</p>
          {(categoryPapers as any[]).map(paper => {
            const isSelected    = value === paper.name
            const addOnA4       = paper.addOn?.['A4'] || 0
            const addOnA3       = paper.addOn?.['A3'] || 0
            const hasPremium    = addOnA4 > 0 || addOnA3 > 0
            const isOutOfStock  = !paper.in_stock
            const isRecommended = bestForKey && paper.best_for?.includes(bestForKey)
            return (
              <div key={paper.name}
                onClick={() => !isOutOfStock && onChange(paper.name)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: isSelected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)', borderRadius: 10, cursor: isOutOfStock ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--color-surface)' : 'transparent', opacity: isOutOfStock ? 0.45 : 1, transition: 'all 0.15s', marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0, marginTop: 2, transition: 'all 0.15s' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{paper.name}</p>
                    {isRecommended && !isOutOfStock && <span style={{ fontSize: 10, background: '#185FA5', color: '#fff', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Recommended</span>}
                    {isOutOfStock && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Out of stock</span>}
                    {!hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Included</span>}
                    {hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>+{formatMVR(addOnA4)} A4 · +{formatMVR(addOnA3)} A3</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onViewDetail(paper) }}
                    style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', textDecoration: 'underline', display: 'block' }}>
                    View details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Price breakdown ──────────────────────────────────────────────────────────

function PriceBreakdown({ price, sizes, paperType }: { price: number; sizes: string[]; paperType: string }) {
  const { getPaperAddOn } = usePapers()
  if (price <= 0 || sizes.length === 0) return null
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 10 }}>Price breakdown</p>
      {sizes.filter(s => !['A2'].includes(s)).map(size => {
        const addOn   = getPaperAddOn(paperType, size)
        const baseFee = PRINTING_FEES[size] || 200
        const fee     = Math.round(price * 5 / 100)
        const total   = price + fee + baseFee + addOn + 100
        return (
          <div key={size} style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>{size}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              <span>Artwork + platform fee</span><span>{formatMVR(price + fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              <span>Printing</span><span>{formatMVR(baseFee)}</span>
            </div>
            {addOn > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                <span>Paper upgrade</span><span>{formatMVR(addOn)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              <span>Delivery</span><span>{formatMVR(100)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', borderTop: '0.5px solid var(--color-border)', paddingTop: 5, marginTop: 4 }}>
              <span>Buyer pays</span><span>{formatMVR(total)}</span>
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: '#1D9E75', borderTop: '0.5px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
        <span>You earn</span><span>{formatMVR(price)}</span>
      </div>
    </div>
  )
}

// ─── Image upload slots ───────────────────────────────────────────────────────

function ImageSlots({ files, thumbs, activeSlot, onSelect, onClear, onSetActive, slotPrefix }: {
  files:       (File | null)[]
  thumbs:      (string | null)[]
  activeSlot:  number
  onSelect:    (idx: number, file: File) => void
  onClear:     (idx: number) => void
  onSetActive: (idx: number) => void
  slotPrefix:  string
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        {[0, 1, 2].map(i => {
          const thumb    = thumbs[i]
          const isActive = activeSlot === i && !!thumb
          const inputId  = `${slotPrefix}-img-${i}`
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div
                onClick={() => thumb ? onSetActive(i) : document.getElementById(inputId)?.click()}
                style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', border: isActive ? '2px solid #1a1a1a' : thumb ? '0.5px solid var(--color-border)' : '0.5px dashed var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border-color 0.15s' }}>
                {thumb ? (
                  <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: 22, marginBottom: 2 }}>+</div>
                    <p style={{ fontSize: 10 }}>{i === 0 ? 'Main image' : 'Add image'}</p>
                  </div>
                )}
                {i === 0 && thumb && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 20 }}>Main</div>
                )}
                {thumb && (
                  <button onClick={e => { e.stopPropagation(); onClear(i) }}
                    style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                )}
              </div>
              {thumb && (
                <button onClick={() => document.getElementById(inputId)?.click()}
                  style={{ fontSize: 10, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', display: 'block', width: '100%', textAlign: 'center' }}>
                  Change
                </button>
              )}
              <input type="file" id={inputId} accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) onSelect(i, e.target.files[0]) }} />
            </div>
          )
        })}
      </div>
      {thumbs[activeSlot] && (
        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface)', marginBottom: 10, border: '0.5px solid var(--color-border)' }}>
          <img src={thumbs[activeSlot]!} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain', pointerEvents: 'none' }} />
        </div>
      )}
      <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>Room mockups and close-up detail shots sell significantly better.</p>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UploadTab({ profile, onDraftSaved, onSubmitted }: {
  profile:       { artist_code: string; full_name: string }
  onDraftSaved:  () => void
  onSubmitted:   () => void
}) {
  const supabase = createClient()
  const { getDefaultPaper } = usePapers()

  // ── Wizard state ──
  const [step, setStep]             = useState<WizardStep>('type')
  const [uploadType, setUploadType] = useState<UploadType>('single')

  // ── Series / bundle state ──
  const [seriesName,          setSeriesName]          = useState('')
  const [seriesCategory,      setSeriesCategory]      = useState('Photography')
  const [bundlePrice,         setBundlePrice]         = useState('')
  const [individualListings,  setIndividualListings]  = useState(true)
  const [bundleCoverFile,     setBundleCoverFile]     = useState<File | null>(null)
  const [bundleCoverThumb,    setBundleCoverThumb]    = useState<string | null>(null)

  // ── Draft state ──
  const [drafts,    setDrafts]    = useState<Draft[]>([])
  const [draftId,   setDraftId]   = useState<string | null>(null)
  const [seriesId,  setSeriesId]  = useState<string | null>(null)

  // ── Pieces state ──
  const [pieces,       setPieces]       = useState<PieceState[]>([newPiece()])
  const [editingIdx,   setEditingIdx]   = useState<number>(0)
  const [activeSlot,   setActiveSlot]   = useState<number>(0)

  // ── Single artwork state (reuses pieces[0]) ──
  const [singleCategory, setSingleCategory] = useState('Photography')

  // ── UI state ──
  const [submitting,   setSubmitting]   = useState(false)
  const [detailPaper,  setDetailPaper]  = useState<any>(null)

  const editingPiece = pieces[editingIdx] ?? pieces[0]

  // ── Load drafts on mount ──
  useEffect(() => { fetchDrafts() }, [])

  async function fetchDrafts() {
    const res  = await fetch('/api/artwork/draft')
    const json = await res.json()
    setDrafts(json.drafts || [])
  }

  // ── Navigation ──
  function goTo(s: WizardStep) {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (step === 'review')      { goTo(uploadType === 'single' ? 'piece-detail' : 'pieces'); return }
    if (step === 'piece-detail'){ goTo(uploadType === 'single' ? 'type' : 'pieces'); return }
    if (step === 'pieces')      { goTo('series'); return }
    if (step === 'series')      { goTo('type'); return }
  }

  // ── Type picker → continue ──
  function handleTypeContinue() {
    if (uploadType === 'single') {
      goTo('piece-detail')
    } else {
      goTo('series')
    }
  }

  // ── Series details → continue (creates draft) ──
  async function handleSeriesContinue() {
    if (!seriesName.trim()) { toast.error('Please enter a name'); return }

    // Upload bundle cover if provided
    let bundleCoverUrl: string | null = null
    if (uploadType === 'bundle' && bundleCoverFile) {
      const ext  = bundleCoverFile.name.split('.').pop()
      const path = `bundle-covers/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('artwork-previews').upload(path, bundleCoverFile, { contentType: bundleCoverFile.type })
      if (!error) {
        const { data } = supabase.storage.from('artwork-previews').getPublicUrl(path)
        bundleCoverUrl = data.publicUrl
      }
    }

    const res = await fetch('/api/artwork/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:                uploadType,
        series_name:         seriesName.trim(),
        category:            seriesCategory,
        bundle_price:        uploadType === 'bundle' && bundlePrice ? parseInt(bundlePrice) : null,
        individual_listings: individualListings,
        bundle_preview_url:  bundleCoverUrl,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Failed to save draft'); return }

    setDraftId(json.draft.id)
    onDraftSaved()
    goTo('pieces')
  }

  // ── Piece management ──
  function updatePiece(idx: number, updates: Partial<PieceState>) {
    setPieces(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p))
  }

  function handleImageSelect(pieceIdx: number, slotIdx: number, file: File) {
    const reader = new FileReader()
    reader.onload = ev => {
      const newFiles  = [...pieces[pieceIdx].imageFiles];  newFiles[slotIdx]  = file
      const newThumbs = [...pieces[pieceIdx].imageThumbs]; newThumbs[slotIdx] = ev.target?.result as string
      updatePiece(pieceIdx, { imageFiles: newFiles, imageThumbs: newThumbs })
      setActiveSlot(slotIdx)
    }
    reader.readAsDataURL(file)
  }

  function clearImageSlot(pieceIdx: number, slotIdx: number) {
    const newFiles  = [...pieces[pieceIdx].imageFiles];  newFiles[slotIdx]  = null
    const newThumbs = [...pieces[pieceIdx].imageThumbs]; newThumbs[slotIdx] = null
    updatePiece(pieceIdx, { imageFiles: newFiles, imageThumbs: newThumbs })
    if (activeSlot === slotIdx) setActiveSlot(0)
  }

  function openPiece(idx: number) {
    setEditingIdx(idx)
    setActiveSlot(0)
    goTo('piece-detail')
  }

  function addPiece() {
    const idx = pieces.length
    setPieces(prev => [...prev, newPiece()])
    setEditingIdx(idx)
    setActiveSlot(0)
    goTo('piece-detail')
  }

  // ── Save a piece (Done button) ──
  async function handlePieceDone() {
    const p = editingPiece
    const isBundle  = uploadType === 'bundle'
    const isSingle  = uploadType === 'single'
    const labelName = isBundle ? 'piece title' : 'variant label'

    if (!isSingle && !p.label.trim())  { toast.error(`Please enter a ${labelName}`); return }
    if (!p.hiresFile)                  { toast.error('Please upload a hi-res file'); return }
    if (!p.imageFiles[0])              { toast.error('Please upload a main preview image'); return }
    if (!p.artTitle.trim())            { toast.error('Please enter a title'); return }
    if (p.sizes.length === 0)          { toast.error('Please select at least one size'); return }
    if (!p.price || parseInt(p.price) < 1) { toast.error('Please set a price'); return }

    const dimError = await validateHiRes(p.hiresFile, p.sizes)
    if (dimError) { toast.error(dimError); return }

    // Upload files
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const { data: prof } = await supabase
        .from('profiles')
        .select('artist_code, full_name')
        .eq('id', session.user.id)
        .single()
      if (!prof?.artist_code) throw new Error('Artist code not found')

      // Get current count for SKU
      const { count } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', session.user.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const sku = `FP-${prof.artist_code}-${seq}`

      toast.loading('Uploading hi-res file...', { id: 'piece-upload' })
      const hiresExt  = p.hiresFile.name.split('.').pop()
      const hiresPath = `${sku}-hires.${hiresExt}`
      const { error: hiresError } = await supabase.storage
        .from('artwork-hires')
        .upload(hiresPath, p.hiresFile, { contentType: p.hiresFile.type, upsert: true })
      if (hiresError) throw hiresError

      toast.loading('Uploading preview...', { id: 'piece-upload' })
      const previewFile = p.imageFiles[0]!
      const previewExt  = previewFile.name.split('.').pop()
      const previewPath = `${sku}-preview.${previewExt}`
      const { error: previewError } = await supabase.storage
        .from('artwork-previews')
        .upload(previewPath, previewFile, { contentType: previewFile.type, upsert: true })
      if (previewError) throw previewError
      const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)

      toast.loading('Uploading gallery...', { id: 'piece-upload' })
      const galleryUrls: string[] = []
      for (let i = 1; i <= 2; i++) {
        const gFile = p.imageFiles[i]
        if (!gFile) continue
        const gExt  = gFile.name.split('.').pop()
        const gPath = `gallery/${sku}-gallery-${i}.${gExt}`
        const { error: gError } = await supabase.storage
          .from('artwork-previews')
          .upload(gPath, gFile, { contentType: gFile.type })
        if (gError) { console.error(gError); continue }
        const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
        galleryUrls.push(gUrl.publicUrl)
      }

      toast.loading('Saving...', { id: 'piece-upload' })

      const isFirstPiece  = !seriesId
      const doneCount     = pieces.filter(pc => pc.done).length
      const isLastPiece   = uploadType === 'single' || doneCount === pieces.length - 1

      // Determine is_primary:
      // single → always true
      // variant → first piece added is primary by default, artist can override
      // bundle → false (bundle owns the storefront card)
      const isPrimary = isSingle
        ? true
        : uploadType === 'variant'
          ? (isFirstPiece || p.isPrimary)
          : false

      const res = await fetch('/api/artwork/submit', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          draft_id:            draftId,
          type:                uploadType,
          series_id:           seriesId,
          series_name:         isSingle ? null : seriesName,
          series_type:         uploadType === 'single' ? null : uploadType === 'variant' ? 'variant' : 'bundle',
          bundle_price:        uploadType === 'bundle' && bundlePrice ? parseInt(bundlePrice) : null,
          individual_listings: individualListings,
          bundle_preview_url:  null, // already saved to draft
          is_primary:          isPrimary,
          is_first_piece:      isFirstPiece,
          is_last_piece:       isLastPiece,
          galleryUrls,
          artwork: {
            sku,
            title:         isSingle ? p.artTitle : p.artTitle || `${seriesName} — ${p.label}`,
            description:   p.description,
            price:         parseInt(p.price),
            hires_path:    hiresPath,
            preview_url:   urlData.publicUrl,
            sizes:         p.sizes,
            status:        'pending',
            category:      isSingle ? singleCategory : seriesCategory,
            paper_type:    p.paperType || getDefaultPaper(isSingle ? singleCategory : seriesCategory),
            edition_size:  p.isLimited ? parseInt(p.editionSize) : null,
            editions_sold: 0,
            series_label:  isSingle ? null : p.label.trim(),
          },
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')

      // Store series_id from first piece for subsequent pieces
      if (isFirstPiece && result.series_id) setSeriesId(result.series_id)

      // Update local piece state
      updatePiece(editingIdx, { done: true, sku, artworkId: result.artwork.id })

      // Update draft pieces jsonb
      if (draftId) {
        const updatedPieces = pieces.map((pc, i) =>
          i === editingIdx ? { ...pc, label: p.label, submitted: true, sku } : { label: pc.label, submitted: pc.done }
        )
        await fetch('/api/artwork/draft', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: draftId, pieces: updatedPieces }),
        })
        onDraftSaved()
      }

      // Notify Telegram
      await fetch('/api/notify/artwork', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          title:      result.artwork.title,
          artistName: prof.full_name,
          price:      parseInt(p.price),
          sizes:      p.sizes,
          seriesName: isSingle ? null : seriesName,
          type:       uploadType,
        }),
      })

      toast.success(`Saved · ${sku}`, { id: 'piece-upload' })

      // Navigate back to list or review
      if (uploadType === 'single') {
        goTo('review')
      } else {
        goTo('pieces')
      }
    } catch (err: any) {
      toast.error(err.message, { id: 'piece-upload' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Final submit ──
  async function handleFinalSubmit() {
    // Delete draft
    if (draftId) {
      await fetch('/api/artwork/draft', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
      })
    }
    toast.success('Submitted for review!')
    onSubmitted()
  }

  // ── Resume draft ──
  function resumeDraft(draft: Draft) {
    setUploadType(draft.type)
    setSeriesName(draft.series_name || '')
    setSeriesCategory(draft.category || 'Photography')
    setBundlePrice(draft.bundle_price ? String(draft.bundle_price) : '')
    setIndividualListings(draft.individual_listings ?? true)
    setDraftId(draft.id)
    const resumedPieces = (draft.pieces || []).map((p: any) => newPiece({
      label: p.label || '',
      done:  p.submitted || false,
      sku:   p.sku || null,
    }))
    setPieces(resumedPieces.length > 0 ? resumedPieces : [newPiece()])
    goTo(draft.type === 'single' ? 'piece-detail' : 'pieces')
  }

  async function discardDraft(draftId: string) {
    await fetch('/api/artwork/draft', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: draftId }),
    })
    fetchDrafts()
  }

  // ── Derived ──
  const doneCount = pieces.filter(p => p.done).length
  const canSubmit = doneCount >= (uploadType === 'single' ? 1 : 2)

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="card" style={{ maxWidth: 560 }}>

      {/* ── STEP: TYPE PICKER ── */}
      {step === 'type' && (
        <>
          <StepProgress step={step} type={uploadType} />
          <DraftBanner drafts={drafts} onResume={resumeDraft} onDiscard={discardDraft} />
          <SectionTitle title="What are you uploading?" sub="Choose the type that best describes this artwork." />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
            {([
              { type: 'single',  label: 'Single',   sub: 'One artwork, one listing' },
              { type: 'variant', label: 'Variants',  sub: 'Same subject, different versions' },
              { type: 'bundle',  label: 'Bundle',    sub: 'A collection of related pieces' },
            ] as { type: UploadType; label: string; sub: string }[]).map(opt => (
              <div key={opt.type}
                onClick={() => setUploadType(opt.type)}
                style={{ border: uploadType === opt.type ? '2px solid #1a1a1a' : '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 10px', cursor: 'pointer', textAlign: 'center', background: uploadType === opt.type ? 'var(--color-surface)' : 'transparent', transition: 'all 0.15s' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{opt.sub}</p>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-full" onClick={handleTypeContinue}>Continue</button>
        </>
      )}

      {/* ── STEP: SERIES / BUNDLE DETAILS ── */}
      {step === 'series' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 13, padding: 0 }}>← Back</button>
          </div>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle
            title={uploadType === 'bundle' ? 'Collection details' : 'Series details'}
            sub={uploadType === 'bundle' ? 'Set up your collection — name, cover image, and bundle price.' : 'Enter the shared details for this series.'}
          />

          <div className="form-group">
            <label className="form-label">{uploadType === 'bundle' ? 'Collection name' : 'Series name'}</label>
            <input className="form-input" value={seriesName} onChange={e => setSeriesName(e.target.value)}
              placeholder={uploadType === 'bundle' ? 'e.g. America' : 'e.g. Maldives Sunsets'} />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={seriesCategory} onChange={e => setSeriesCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {uploadType === 'bundle' && (
            <>
              <Divider />

              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Collection cover image</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>What buyers see on the storefront card.</p>
              <div
                onClick={() => document.getElementById('bundle-cover-input')?.click()}
                style={{ border: bundleCoverThumb ? '0.5px solid var(--color-border)' : '0.5px dashed var(--color-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16, background: 'var(--color-surface)' }}>
                {bundleCoverThumb
                  ? <img src={bundleCoverThumb} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>🖼</span>}
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>
                    {bundleCoverFile ? bundleCoverFile.name : 'Tap to upload cover image'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>JPG or PNG · recommended 1:1 ratio</p>
                </div>
              </div>
              <input type="file" id="bundle-cover-input" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setBundleCoverFile(file)
                  const reader = new FileReader()
                  reader.onload = ev => setBundleCoverThumb(ev.target?.result as string)
                  reader.readAsDataURL(file)
                }} />

              <div className="form-group">
                <label className="form-label">Bundle price (MVR)</label>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>What buyers pay to get all pieces together.</p>
                <input className="form-input" type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="e.g. 3500" style={{ maxWidth: 160 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Also list pieces individually</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Each piece also appears as its own storefront listing.</p>
                </div>
                <Toggle on={individualListings} onToggle={() => setIndividualListings(v => !v)} />
              </div>
            </>
          )}

          <Divider />
          <button className="btn btn-primary btn-full" onClick={handleSeriesContinue}>Continue</button>
        </>
      )}

      {/* ── STEP: PIECES LIST ── */}
      {step === 'pieces' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 13, padding: 0 }}>← Back</button>
          </div>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle
            title={uploadType === 'bundle' ? 'Add your pieces' : 'Add your variants'}
            sub="Tap to fill in details. Tap a completed one to edit."
          />

          {/* Min pieces notice */}
          <div style={{ background: doneCount >= 2 ? '#E1F5EE' : 'var(--color-surface)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center', fontSize: 12, color: doneCount >= 2 ? '#0F6E56' : 'var(--color-text-muted)' }}>
            {doneCount >= 2
              ? `${doneCount} ${uploadType === 'bundle' ? 'pieces' : 'variants'} ready`
              : `Add at least 2 ${uploadType === 'bundle' ? 'pieces' : 'variants'} to submit`}
          </div>

          {/* Piece rows */}
          {pieces.map((p, i) => (
            <div key={p.id}
              onClick={() => openPiece(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '0.5px solid var(--color-border)', borderRadius: 12, marginBottom: 8, cursor: 'pointer', background: 'var(--color-surface)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.done ? '#E1F5EE' : 'var(--color-border)', flexShrink: 0 }}>
                {p.done
                  ? <span style={{ fontSize: 14, color: '#0F6E56' }}>✓</span>
                  : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {p.label || (uploadType === 'bundle' ? `Piece ${i + 1}` : `Variant ${i + 1}`)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {p.done ? `${p.sku} · MVR ${p.price} · ${p.sizes.join(', ')}` : 'Tap to fill in details'}
                </p>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>›</span>
            </div>
          ))}

          {/* Add another */}
          <div onClick={addPiece}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '0.5px dashed var(--color-border)', borderRadius: 12, cursor: 'pointer', color: 'var(--color-teal)', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>+</span>
            <span>{uploadType === 'bundle' ? 'Add another piece' : 'Add another variant'}</span>
          </div>

          {/* Bottom buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn" onClick={async () => {
              toast.success('Draft saved')
              onDraftSaved()
            }}>
              Save draft
            </button>
            <button className="btn btn-primary" onClick={() => goTo('review')} disabled={!canSubmit}>
              Review &amp; submit
            </button>
          </div>
        </>
      )}

      {/* ── STEP: PIECE DETAIL ── */}
      {step === 'piece-detail' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 13, padding: 0 }}>← Back</button>
          </div>
          <StepProgress step={step} type={uploadType} />

          {/* Variant / bundle label */}
          {uploadType !== 'single' && (
            <>
              <div className="form-group">
                <label className="form-label">{uploadType === 'bundle' ? 'Piece title' : 'Variant label'}</label>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  {uploadType === 'bundle'
                    ? 'The title of this individual piece — e.g. "New York"'
                    : 'What buyers see when choosing — e.g. "Colour", "Black & White"'}
                </p>
                <input className="form-input"
                  value={editingPiece.label}
                  onChange={e => updatePiece(editingIdx, { label: e.target.value })}
                  placeholder={uploadType === 'bundle' ? 'e.g. New York' : 'e.g. Colour version'} />
              </div>
              <Divider />
            </>
          )}

          {/* Hi-res */}
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Hi-res print file</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>Private — never shown to buyers</p>
          <div
            onClick={() => !editingPiece.hiresFile && document.getElementById(`hires-${editingIdx}`)?.click()}
            style={{ border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🖨</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: editingPiece.hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {editingPiece.hiresFile ? editingPiece.hiresFile.name : 'Tap to upload hi-res file'}
              </p>
              {editingPiece.hiresFile && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {(editingPiece.hiresFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
            {editingPiece.hiresFile && (
              <button onClick={e => { e.stopPropagation(); updatePiece(editingIdx, { hiresFile: null }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px' }}>×</button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            JPG or PNG · A4 min 2339×1654px · A3 min 3307×2339px · up to 35 MB
          </p>
          <input type="file" id={`hires-${editingIdx}`} accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) updatePiece(editingIdx, { hiresFile: e.target.files[0] }) }} />

          {/* Preview images */}
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Preview images</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>
            {uploadType === 'variant'
              ? 'First image is the storefront image for this variant.'
              : 'Shown to buyers. Add your watermark before uploading.'}
          </p>
          <ImageSlots
            files={editingPiece.imageFiles}
            thumbs={editingPiece.imageThumbs}
            activeSlot={activeSlot}
            slotPrefix={`piece-${editingIdx}`}
            onSelect={(slotIdx, file) => handleImageSelect(editingIdx, slotIdx, file)}
            onClear={slotIdx => clearImageSlot(editingIdx, slotIdx)}
            onSetActive={setActiveSlot}
          />

          <Divider />

          {/* Artwork info */}
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input"
              value={editingPiece.artTitle}
              onChange={e => updatePiece(editingIdx, { artTitle: e.target.value })}
              placeholder={uploadType === 'variant' ? `e.g. ${seriesName} — Colour` : 'Name your artwork'} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input"
              value={editingPiece.description}
              onChange={e => updatePiece(editingIdx, { description: e.target.value })}
              placeholder="Tell buyers about this piece..." />
          </div>

          {uploadType === 'single' && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={singleCategory} onChange={e => setSingleCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <Divider />

          {/* Sizes */}
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Print sizes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {SIZES.map(({ size, dims, comingSoon }) => (
              <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '0.5px solid var(--color-border)', borderRadius: 10, cursor: comingSoon ? 'not-allowed' : 'pointer', opacity: comingSoon ? 0.45 : 1, background: editingPiece.sizes.includes(size) && !comingSoon ? 'var(--color-surface)' : 'transparent' }}>
                <input type="checkbox"
                  checked={!comingSoon && editingPiece.sizes.includes(size)}
                  disabled={comingSoon}
                  onChange={() => {
                    if (comingSoon) return
                    const next = editingPiece.sizes.includes(size)
                      ? editingPiece.sizes.filter(s => s !== size)
                      : [...editingPiece.sizes, size]
                    updatePiece(editingIdx, { sizes: next })
                  }}
                  style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>
                    {size} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>({dims})</span>
                    {comingSoon && <span style={{ fontSize: 10, marginLeft: 8, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>Coming soon</span>}
                  </p>
                  {!comingSoon && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Base printing fee: {formatMVR(PRINTING_FEES[size] || 0)}</p>}
                </div>
              </label>
            ))}
          </div>

          <Divider />

          {/* Paper */}
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Paper type</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>All prints on Hahnemühle archival papers.</p>
          <PaperSelector
            value={editingPiece.paperType || getDefaultPaper(uploadType === 'single' ? singleCategory : seriesCategory)}
            onChange={v => updatePiece(editingIdx, { paperType: v })}
            category={uploadType === 'single' ? singleCategory : seriesCategory}
            onViewDetail={setDetailPaper}
          />

          <Divider />

          {/* Price */}
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Your price (MVR)</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>We add 5% platform fee + printing costs on top for buyers.</p>
          <input className="form-input" type="number"
            value={editingPiece.price}
            onChange={e => updatePiece(editingIdx, { price: e.target.value })}
            placeholder="e.g. 800"
            style={{ maxWidth: 160, marginBottom: 12 }} />
          <PriceBreakdown
            price={parseInt(editingPiece.price) || 0}
            sizes={editingPiece.sizes}
            paperType={editingPiece.paperType || getDefaultPaper(uploadType === 'single' ? singleCategory : seriesCategory)}
          />

          <Divider />

          {/* Limited edition */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold.</p>
            </div>
            <Toggle on={editingPiece.isLimited} onToggle={() => updatePiece(editingIdx, { isLimited: !editingPiece.isLimited })} />
          </div>
          {editingPiece.isLimited && (
            <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>Edition size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input className="form-input" type="number" min="1" max="999"
                  value={editingPiece.editionSize}
                  onChange={e => updatePiece(editingIdx, { editionSize: e.target.value })}
                  style={{ maxWidth: 100 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
              </div>
            </div>
          )}

          {/* Variant — show on storefront toggle */}
          {uploadType === 'variant' && (
            <>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Show on storefront</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Only one variant per series appears on the storefront grid.</p>
                </div>
                <Toggle on={editingPiece.isPrimary} onToggle={() => updatePiece(editingIdx, { isPrimary: !editingPiece.isPrimary })} />
              </div>
            </>
          )}

          <Divider />

          {/* SKU preview */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
              FP-{profile.artist_code}-••• next available
            </p>
          </div>

          <button className="btn btn-primary btn-full" onClick={handlePieceDone} disabled={submitting}>
            {submitting ? 'Saving...' : uploadType === 'single' ? 'Continue to review' : 'Done'}
          </button>
        </>
      )}

      {/* ── STEP: REVIEW ── */}
      {step === 'review' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 13, padding: 0 }}>← Back</button>
          </div>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle title="Ready to submit?" sub="Review everything before sending for approval." />

          {uploadType !== 'single' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Type</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{uploadType === 'bundle' ? 'Bundle' : 'Variants'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{uploadType === 'bundle' ? 'Collection' : 'Series'}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{seriesName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Category</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{seriesCategory}</span>
              </div>
              {uploadType === 'bundle' && bundlePrice && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Bundle price</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(parseInt(bundlePrice))}</span>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {uploadType === 'single' ? 'Artwork' : uploadType === 'bundle' ? `Pieces (${doneCount})` : `Variants (${doneCount})`}
            </p>
            {pieces.filter(p => p.done).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--color-surface)', borderRadius: 12, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, color: '#0F6E56' }}>✓</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{p.label || p.artTitle || `Piece ${i + 1}`}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {p.sku} · {formatMVR(parseInt(p.price))} · {p.sizes.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', margin: '16px 0' }}>
            <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
              Once submitted, our team reviews your artwork before it goes live. You'll be notified by email.
            </p>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleFinalSubmit}>Submit for review</button>
          <button className="btn btn-full" onClick={goBack} style={{ marginTop: 10 }}>Make changes</button>
        </>
      )}

      {detailPaper && <PaperDetailModal paper={detailPaper} onClose={() => setDetailPaper(null)} />}
    </div>
  )
}
