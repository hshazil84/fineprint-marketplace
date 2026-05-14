'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { PaperDetailModal } from './PaperDetailModal'
import { createDraft, updateDraft, fetchDrafts, deleteDraft } from '@/lib/uploadDraft'
import { uploadArtworkFiles, uploadBundleCover } from '@/lib/uploadArtwork'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Photography', 'Fine Art', 'Abstract', 'Illustration',
  'Digital Art', 'Mixed Media', 'Watercolour', 'Charcoal & Sketch',
]

const SIZES = [
  { size: 'A4', dims: '210 x 297 mm', comingSoon: false },
  { size: 'A3', dims: '297 x 420 mm', comingSoon: false },
  { size: 'A2', dims: '420 x 594 mm', comingSoon: true  },
]

// ─── Motion styles ────────────────────────────────────────────────────────────

const MOTION_CSS = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
  @keyframes pulseDot {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.4; }
  }
  .step-enter     { animation: slideInRight 0.3s cubic-bezier(0.32,0.72,0,1) both; }
  .step-enter-rev { animation: slideInLeft  0.3s cubic-bezier(0.32,0.72,0,1) both; }
  .fade-up        { animation: fadeUp 0.28s cubic-bezier(0.32,0.72,0,1) both; }
  .fade-in        { animation: fadeIn 0.25s ease both; }
  .shake          { animation: shake 0.35s ease both; }
  .type-card {
    transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }
  .type-card:active { transform: scale(0.97); }
  .type-card.selected { transform: scale(1.02); }
  .piece-row {
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .piece-dot {
    transition: background 0.25s ease, color 0.25s ease;
  }
  .btn-upload {
    transition: opacity 0.2s ease, transform 0.15s ease;
  }
  .btn-upload:active:not(:disabled) { transform: scale(0.98); }
  .btn-upload:disabled { opacity: 0.35; }
  .pip { transition: width 0.3s cubic-bezier(0.32,0.72,0,1), background 0.3s ease; }
  .paper-opt {
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .upload-zone {
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .upload-zone:hover { border-color: var(--color-text); background: var(--color-surface); }
`

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadType = 'single' | 'variant' | 'bundle'
type WizardStep = 'type' | 'series' | 'pieces' | 'piece-detail' | 'review'

interface PieceState {
  id:          string
  label:       string
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
  artworkId:   number | null
  sku:         string | null
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
    id: crypto.randomUUID(), label: '', artTitle: '', description: '',
    price: '', sizes: ['A4', 'A3'], paperType: '', isPrimary: false,
    isLimited: false, editionSize: '50', hiresFile: null,
    imageFiles: [null, null, null], imageThumbs: [null, null, null],
    done: false, artworkId: null, sku: null, ...overrides,
  }
}

async function validateHiRes(file: File, sizes: string[]): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const long = Math.max(w, h), short = Math.min(w, h)
      if (sizes.includes('A3') && (long < 3307 || short < 2339)) {
        resolve(`For A3, min 3307×2339px. Yours is ${w}×${h}px.`); return
      }
      if (sizes.includes('A4') && (long < 2339 || short < 1654)) {
        resolve(`For A4, min 2339×1654px. Yours is ${w}×${h}px.`); return
      }
      resolve(null)
    }
    img.onerror = () => resolve('Could not read image. Upload a JPG or PNG.')
    img.src = URL.createObjectURL(file)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: '0.25px', background: 'var(--color-border)', margin: '20px 0' }} />
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 13, background: on ? '#1a1a1a' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.22s ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.22s cubic-bezier(0.32,0.72,0,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </div>
  )
}

function StepProgress({ step, type }: { step: WizardStep; type: UploadType }) {
  const steps: WizardStep[] = type === 'single'
    ? ['type', 'piece-detail', 'review']
    : ['type', 'series', 'pieces', 'review']
  const active = steps.indexOf(step === 'piece-detail' && type !== 'single' ? 'pieces' : step)
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 22 }}>
      {steps.map((_, i) => (
        <div key={i} className="pip" style={{
          height: 3, borderRadius: 2,
          width: i === active ? 28 : i < active ? 20 : 12,
          background: i <= active ? '#1a1a1a' : 'var(--color-border)',
        }} />
      ))}
    </div>
  )
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <p style={{ fontSize: 21, fontWeight: 700, color: 'var(--color-text)', marginBottom: 5, letterSpacing: '-0.4px' }}>{title}</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>{sub}</p>
    </>
  )
}

function DraftBanner({ drafts, onResume, onDiscard }: {
  drafts:    Draft[]
  onResume:  (d: Draft) => void
  onDiscard: (id: string) => void
}) {
  if (!drafts.length) return null
  return (
    <div className="fade-in" style={{ marginBottom: 18 }}>
      {drafts.map(d => (
        <div key={d.id} className="fade-up"
          style={{ background: '#EFF6FF', border: '0.25px solid #93C5FD', borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, cursor: 'pointer', transition: 'background 0.15s ease' }}
          onClick={() => onResume(d)}>
          <span style={{ fontSize: 16 }}>🕐</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#185FA5' }}>Unfinished upload</p>
            <p style={{ fontSize: 11, color: '#378ADD', marginTop: 2 }}>
              {d.series_name || 'Untitled'} · {d.type === 'single' ? 'Single' : d.type === 'variant' ? 'Variants' : 'Bundle'} · {d.pieces.filter((p: any) => p.submitted).length} of {d.pieces.length} done
            </p>
          </div>
          <button onClick={e => { e.stopPropagation(); onDiscard(d.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
}

function PaperSelector({ value, onChange, category, onViewDetail }: {
  value: string; onChange: (v: string) => void; category: string; onViewDetail: (p: any) => void
}) {
  const { loading, getPapersByCategory } = usePapers()
  const papersByCategory = getPapersByCategory()
  const bestForKey = CATEGORY_TO_BEST_FOR[category]
  if (loading) return <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Loading papers...</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      {Object.entries(papersByCategory).map(([cat, papers]) => (
        <div key={cat}>
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 5, marginTop: 7 }}>{cat}</p>
          {(papers as any[]).map(paper => {
            const isSelected   = value === paper.name
            const addOnA4      = paper.addOn?.['A4'] || 0
            const addOnA3      = paper.addOn?.['A3'] || 0
            const hasPremium   = addOnA4 > 0 || addOnA3 > 0
            const isOOS        = !paper.in_stock
            const isRec        = bestForKey && paper.best_for?.includes(bestForKey)
            return (
              <div key={paper.name} className="paper-opt"
                onClick={() => !isOOS && onChange(paper.name)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: isSelected ? '1px solid #1a1a1a' : '0.25px solid var(--color-border)', borderRadius: 9, cursor: isOOS ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--color-surface)' : 'transparent', opacity: isOOS ? 0.4 : 1, marginBottom: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: isSelected ? '4px solid #1a1a1a' : '0.25px solid var(--color-border)', flexShrink: 0, marginTop: 2, transition: 'border 0.15s ease' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, fontWeight: 500 }}>{paper.name}</p>
                    {isRec && !isOOS && <span style={{ fontSize: 9, background: '#185FA5', color: '#fff', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Recommended</span>}
                    {isOOS && <span style={{ fontSize: 9, background: '#FCEBEB', color: '#A32D2D', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Out of stock</span>}
                    {!hasPremium && !isOOS && <span style={{ fontSize: 9, background: '#E1F5EE', color: '#0F6E56', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Included</span>}
                    {hasPremium && !isOOS && <span style={{ fontSize: 9, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>+{formatMVR(addOnA4)} A4 · +{formatMVR(addOnA3)} A3</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onViewDetail(paper) }}
                    style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0 0', textDecoration: 'underline' }}>View details</button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PriceBreakdown({ price, sizes, paperType }: { price: number; sizes: string[]; paperType: string }) {
  const { getPaperAddOn } = usePapers()
  if (price <= 0 || !sizes.length) return null
  return (
    <div className="fade-up" style={{ background: 'var(--color-surface)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 9 }}>Price breakdown</p>
      {sizes.filter(s => s !== 'A2').map(size => {
        const addOn   = getPaperAddOn(paperType, size)
        const baseFee = PRINTING_FEES[size] || 200
        const fee     = Math.round(price * 5 / 100)
        const total   = price + fee + baseFee + addOn + 100
        return (
          <div key={size} style={{ marginBottom: 9 }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 3 }}>{size}</p>
            {[
              ['Artwork + platform fee', formatMVR(price + fee)],
              ['Printing', formatMVR(baseFee)],
              ...(addOn > 0 ? [['Paper upgrade', formatMVR(addOn)]] : []),
              ['Delivery', formatMVR(100)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>
                <span>{label}</span><span>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, color: 'var(--color-text)', borderTop: '0.25px solid var(--color-border)', paddingTop: 4, marginTop: 3 }}>
              <span>Buyer pays</span><span>{formatMVR(total)}</span>
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#1D9E75', borderTop: '0.25px solid var(--color-border)', paddingTop: 8, marginTop: 3 }}>
        <span>You earn</span><span>{formatMVR(price)}</span>
      </div>
    </div>
  )
}

function ImageSlots({ files, thumbs, activeSlot, onSelect, onClear, onSetActive, slotPrefix }: {
  files: (File | null)[], thumbs: (string | null)[], activeSlot: number,
  onSelect: (i: number, f: File) => void, onClear: (i: number) => void,
  onSetActive: (i: number) => void, slotPrefix: string,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
        {[0, 1, 2].map(i => {
          const thumb   = thumbs[i]
          const active  = activeSlot === i && !!thumb
          const inputId = `${slotPrefix}-img-${i}`
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div onClick={() => thumb ? onSetActive(i) : document.getElementById(inputId)?.click()}
                style={{ aspectRatio: '1', borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: active ? '1.5px solid #1a1a1a' : thumb ? '0.25px solid var(--color-border)' : '0.25px dashed var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border-color 0.15s ease' }}>
                {thumb
                  ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', transition: 'opacity 0.2s ease' }} />
                  : <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <div style={{ fontSize: 18, marginBottom: 1 }}>+</div>
                      <p style={{ fontSize: 9 }}>{i === 0 ? 'Main' : 'Add'}</p>
                    </div>}
                {i === 0 && thumb && <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 8, fontWeight: 500, padding: '1px 6px', borderRadius: 20 }}>Main</div>}
                {thumb && <button onClick={e => { e.stopPropagation(); onClear(i) }}
                  style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
              </div>
              {thumb && <button onClick={() => document.getElementById(inputId)?.click()}
                style={{ fontSize: 9, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'block', width: '100%', textAlign: 'center' }}>Change</button>}
              <input type="file" id={inputId} accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) onSelect(i, e.target.files[0]) }} />
            </div>
          )
        })}
      </div>
      {thumbs[activeSlot] && (
        <div style={{ borderRadius: 9, overflow: 'hidden', background: 'var(--color-surface)', marginBottom: 8, border: '0.25px solid var(--color-border)' }}>
          <img src={thumbs[activeSlot]!} alt="" style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'contain', pointerEvents: 'none' }} />
        </div>
      )}
      <div style={{ background: '#FAEEDA', border: '0.25px solid #EF9F27', borderRadius: 7, padding: '9px 13px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: '#633806', lineHeight: 1.6 }}>Room mockups and close-up detail shots sell significantly better.</p>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UploadTab({ profile, onDraftSaved, onSubmitted }: {
  profile:      { artist_code: string; full_name: string }
  onDraftSaved: () => void
  onSubmitted:  () => void
}) {
  const supabase = createClient()
  const { getDefaultPaper } = usePapers()

  const [step,       setStep]       = useState<WizardStep>('type')
  const [direction,  setDirection]  = useState<'forward' | 'back'>('forward')
  const [uploadType, setUploadType] = useState<UploadType>('single')

  const [seriesName,         setSeriesName]         = useState('')
  const [seriesCategory,     setSeriesCategory]     = useState('Photography')
  const [bundlePrice,        setBundlePrice]        = useState('')
  const [individualListings, setIndividualListings] = useState(true)
  const [bundleCoverFile,    setBundleCoverFile]    = useState<File | null>(null)
  const [bundleCoverThumb,   setBundleCoverThumb]   = useState<string | null>(null)

  const [drafts,   setDrafts]   = useState<Draft[]>([])
  const [draftId,  setDraftId]  = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [token,    setToken]    = useState<string | null>(null)

  const [pieces,     setPieces]     = useState<PieceState[]>([newPiece()])
  const [editingIdx, setEditingIdx] = useState<number>(0)
  const [activeSlot, setActiveSlot] = useState<number>(0)

  const [singleCategory, setSingleCategory] = useState('Photography')
  const [submitting,     setSubmitting]     = useState(false)
  const [shaking,        setShaking]        = useState(false)
  const [detailPaper,    setDetailPaper]    = useState<any>(null)

  const editingPiece = pieces[editingIdx] ?? pieces[0]

  // Load session token + drafts on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchDrafts(session.access_token).then(setDrafts).catch(() => {})
    })
  }, [])

  function goTo(s: WizardStep, dir: 'forward' | 'back' = 'forward') {
    setDirection(dir)
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (step === 'review')       { goTo(uploadType === 'single' ? 'piece-detail' : 'pieces', 'back'); return }
    if (step === 'piece-detail') { goTo(uploadType === 'single' ? 'type' : 'pieces', 'back'); return }
    if (step === 'pieces')       { goTo('series', 'back'); return }
    if (step === 'series')       { goTo('type', 'back'); return }
  }

  function shake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  function handleTypeContinue() {
    goTo(uploadType === 'single' ? 'piece-detail' : 'series')
  }

  async function handleSeriesContinue() {
    if (!seriesName.trim()) { toast.error('Please enter a name'); shake(); return }
    if (!token) { toast.error('Not logged in'); return }

    let bundleCoverUrl: string | null = null
    if (uploadType === 'bundle' && bundleCoverFile) {
      bundleCoverUrl = await uploadBundleCover(supabase, bundleCoverFile)
    }

    try {
      const draft = await createDraft(token, {
        type:                uploadType,
        series_name:         seriesName.trim(),
        category:            seriesCategory,
        bundle_price:        uploadType === 'bundle' && bundlePrice ? parseInt(bundlePrice) : null,
        individual_listings: individualListings,
        bundle_preview_url:  bundleCoverUrl,
      })
      setDraftId(draft.id)
      onDraftSaved()
      goTo('pieces')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

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

  async function handlePieceDone() {
    const p        = editingPiece
    const isSingle = uploadType === 'single'
    const isBundle = uploadType === 'bundle'

    if (!isSingle && !p.label.trim())       { toast.error(`Please enter a ${isBundle ? 'piece title' : 'variant label'}`); shake(); return }
    if (!p.hiresFile)                        { toast.error('Please upload a hi-res file'); shake(); return }
    if (!p.imageFiles[0])                    { toast.error('Please upload a main preview image'); shake(); return }
    if (!p.artTitle.trim())                  { toast.error('Please enter a title'); shake(); return }
    if (!p.sizes.length)                     { toast.error('Please select at least one size'); shake(); return }
    if (!p.price || parseInt(p.price) < 1)  { toast.error('Please set a price'); shake(); return }

    const dimError = await validateHiRes(p.hiresFile, p.sizes)
    if (dimError) { toast.error(dimError); shake(); return }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const { data: prof } = await supabase.from('profiles').select('artist_code, full_name').eq('id', session.user.id).single()
      if (!prof?.artist_code) throw new Error('Artist code not found')

      const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', session.user.id)
      const sku = `FP-${prof.artist_code}-${String((count || 0) + 1).padStart(3, '0')}`

      toast.loading('Uploading...', { id: 'piece-upload' })

      const { hiresPath, previewUrl, galleryUrls } = await uploadArtworkFiles(
        supabase, sku, p.hiresFile, p.imageFiles,
        msg => toast.loading(msg, { id: 'piece-upload' }),
      )

      toast.loading('Saving...', { id: 'piece-upload' })

      const isFirstPiece = !seriesId
      const doneCount    = pieces.filter(pc => pc.done).length
      const isLastPiece  = isSingle || doneCount === pieces.length - 1
      const isPrimary    = isSingle ? true : uploadType === 'variant' ? (isFirstPiece || p.isPrimary) : false

      const res = await fetch('/api/artwork/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          draft_id: draftId, type: uploadType,
          series_id: seriesId, series_name: isSingle ? null : seriesName,
          series_type: isSingle ? null : uploadType === 'variant' ? 'variant' : 'bundle',
          bundle_price: uploadType === 'bundle' && bundlePrice ? parseInt(bundlePrice) : null,
          individual_listings: individualListings,
          bundle_preview_url: null,
          is_primary: isPrimary, is_first_piece: isFirstPiece, is_last_piece: isLastPiece,
          galleryUrls,
          artwork: {
            sku, title: isSingle ? p.artTitle : p.artTitle || `${seriesName} — ${p.label}`,
            description: p.description, price: parseInt(p.price),
            hires_path: hiresPath, preview_url: previewUrl,
            sizes: p.sizes, status: 'pending',
            category: isSingle ? singleCategory : seriesCategory,
            paper_type: p.paperType || getDefaultPaper(isSingle ? singleCategory : seriesCategory),
            edition_size: p.isLimited ? parseInt(p.editionSize) : null,
            editions_sold: 0, series_label: isSingle ? null : p.label.trim(),
          },
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')

      if (isFirstPiece && result.series_id) setSeriesId(result.series_id)
      updatePiece(editingIdx, { done: true, sku, artworkId: result.artwork.id })

      if (draftId && token) {
        const updatedPieces = pieces.map((pc, i) =>
          i === editingIdx ? { label: p.label, submitted: true, sku } : { label: pc.label, submitted: pc.done }
        )
        await updateDraft(token, { draft_id: draftId, pieces: updatedPieces })
        onDraftSaved()
      }

      await fetch('/api/notify/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, title: result.artwork.title, artistName: prof.full_name, price: parseInt(p.price), sizes: p.sizes, seriesName: isSingle ? null : seriesName, type: uploadType }),
      })

      toast.success(`Saved · ${sku}`, { id: 'piece-upload' })
      goTo(isSingle ? 'review' : 'pieces')

    } catch (err: any) {
      toast.error(err.message, { id: 'piece-upload' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinalSubmit() {
    if (draftId && token) await deleteDraft(token, draftId)
    toast.success('Submitted for review!')
    onSubmitted()
  }

  function resumeDraft(draft: Draft) {
    setUploadType(draft.type)
    setSeriesName(draft.series_name || '')
    setSeriesCategory(draft.category || 'Photography')
    setBundlePrice(draft.bundle_price ? String(draft.bundle_price) : '')
    setIndividualListings(draft.individual_listings ?? true)
    setDraftId(draft.id)
    const resumed = (draft.pieces || []).map((p: any) => newPiece({ label: p.label || '', done: p.submitted || false, sku: p.sku || null }))
    setPieces(resumed.length > 0 ? resumed : [newPiece()])
    goTo(draft.type === 'single' ? 'piece-detail' : 'pieces')
  }

  async function handleDiscard(id: string) {
    if (token) await deleteDraft(token, id)
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  const doneCount = pieces.filter(p => p.done).length
  const canSubmit = doneCount >= (uploadType === 'single' ? 1 : 2)
  const animClass = direction === 'forward' ? 'step-enter' : 'step-enter-rev'

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <style>{MOTION_CSS}</style>

      {/* TYPE PICKER */}
      {step === 'type' && (
        <div className={animClass}>
          <StepProgress step={step} type={uploadType} />
          <DraftBanner drafts={drafts} onResume={resumeDraft} onDiscard={handleDiscard} />
          <SectionTitle title="What are you uploading?" sub="Choose the type that best describes this artwork." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, marginBottom: 24 }}>
            {([
              { type: 'single',  label: 'Single',  sub: 'One artwork, one listing' },
              { type: 'variant', label: 'Variants', sub: 'Same subject, different versions' },
              { type: 'bundle',  label: 'Bundle',   sub: 'A collection of related pieces' },
            ] as { type: UploadType; label: string; sub: string }[]).map(opt => (
              <div key={opt.type} className={`type-card${uploadType === opt.type ? ' selected' : ''}`}
                onClick={() => setUploadType(opt.type)}
                style={{ border: uploadType === opt.type ? '1.5px solid #1a1a1a' : '0.25px solid var(--color-border)', borderRadius: 12, padding: '13px 10px', cursor: 'pointer', textAlign: 'center', background: uploadType === opt.type ? 'var(--color-surface)' : 'transparent' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{opt.label}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{opt.sub}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-full btn-upload" onClick={handleTypeContinue}>Continue</button>
        </div>
      )}

      {/* SERIES / BUNDLE DETAILS */}
      {step === 'series' && (
        <div className={animClass}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 12, padding: 0, marginBottom: 14 }}>← Back</button>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle
            title={uploadType === 'bundle' ? 'Collection details' : 'Series details'}
            sub={uploadType === 'bundle' ? 'Set up your collection — name, cover image, and bundle price.' : 'Enter the shared details for this series.'}
          />
          <div className="form-group">
            <label className="form-label">{uploadType === 'bundle' ? 'Collection name' : 'Series name'}</label>
            <input className={`form-input${shaking ? ' shake' : ''}`} value={seriesName} onChange={e => setSeriesName(e.target.value)}
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
              <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Collection cover image</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 9 }}>What buyers see on the storefront card.</p>
              <div className="upload-zone" onClick={() => document.getElementById('bundle-cover-input')?.click()}
                style={{ border: bundleCoverThumb ? '0.25px solid var(--color-border)' : '0.25px dashed var(--color-border)', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14, background: 'var(--color-surface)' }}>
                {bundleCoverThumb ? <img src={bundleCoverThumb} alt="" style={{ width: 44, height: 44, borderRadius: 7, objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🖼</span>}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>{bundleCoverFile ? bundleCoverFile.name : 'Tap to upload cover image'}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>JPG or PNG · recommended 1:1 ratio</p>
                </div>
              </div>
              <input type="file" id="bundle-cover-input" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; setBundleCoverFile(f); const r = new FileReader(); r.onload = ev => setBundleCoverThumb(ev.target?.result as string); r.readAsDataURL(f) }} />
              <div className="form-group">
                <label className="form-label">Bundle price (MVR)</label>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 7 }}>What buyers pay to get all pieces together.</p>
                <input className="form-input" type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="e.g. 3500" style={{ maxWidth: 150 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>Also list pieces individually</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>Each piece also appears as its own storefront listing.</p>
                </div>
                <Toggle on={individualListings} onToggle={() => setIndividualListings(v => !v)} />
              </div>
            </>
          )}
          <Divider />
          <button className="btn btn-primary btn-full btn-upload" onClick={handleSeriesContinue}>Continue</button>
        </div>
      )}

      {/* PIECES LIST */}
      {step === 'pieces' && (
        <div className={animClass}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 12, padding: 0, marginBottom: 14 }}>← Back</button>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle
            title={uploadType === 'bundle' ? 'Add your pieces' : 'Add your variants'}
            sub="Tap to fill in details. Tap a completed one to edit."
          />
          <div style={{ background: doneCount >= 2 ? '#E1F5EE' : 'var(--color-surface)', borderRadius: 9, padding: '9px 13px', marginBottom: 13, textAlign: 'center', fontSize: 11, color: doneCount >= 2 ? '#0F6E56' : 'var(--color-text-muted)', transition: 'background 0.3s ease, color 0.3s ease' }}>
            {doneCount >= 2 ? `${doneCount} ${uploadType === 'bundle' ? 'pieces' : 'variants'} ready` : `Add at least 2 ${uploadType === 'bundle' ? 'pieces' : 'variants'} to submit`}
          </div>
          {pieces.map((p, i) => (
            <div key={p.id} className="piece-row fade-up"
              onClick={() => openPiece(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', border: '0.25px solid var(--color-border)', borderRadius: 11, marginBottom: 7, cursor: 'pointer', background: 'var(--color-surface)' }}>
              <div className="piece-dot" style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.done ? '#E1F5EE' : 'var(--color-border)', flexShrink: 0 }}>
                {p.done ? <span style={{ fontSize: 13, color: '#0F6E56' }}>✓</span> : <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {p.label || (uploadType === 'bundle' ? `Piece ${i + 1}` : `Variant ${i + 1}`)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {p.done ? `${p.sku} · MVR ${p.price} · ${p.sizes.join(', ')}` : 'Tap to fill in details'}
                </p>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 15, transition: 'transform 0.15s ease' }}>›</span>
            </div>
          ))}
          <div onClick={addPiece}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', border: '0.25px dashed var(--color-border)', borderRadius: 11, cursor: 'pointer', color: 'var(--color-teal)', fontSize: 13, fontWeight: 500, marginBottom: 14, transition: 'background 0.15s ease' }}>
            <span style={{ fontSize: 16 }}>+</span>
            <span>{uploadType === 'bundle' ? 'Add another piece' : 'Add another variant'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <button className="btn btn-upload" onClick={() => { toast.success('Draft saved'); onDraftSaved() }}>Save draft</button>
            <button className="btn btn-primary btn-upload" onClick={() => goTo('review')} disabled={!canSubmit}>Review &amp; submit</button>
          </div>
        </div>
      )}

      {/* PIECE DETAIL */}
      {step === 'piece-detail' && (
        <div className={animClass}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 12, padding: 0, marginBottom: 14 }}>← Back</button>
          <StepProgress step={step} type={uploadType} />

          {uploadType !== 'single' && (
            <>
              <div className="form-group">
                <label className="form-label">{uploadType === 'bundle' ? 'Piece title' : 'Variant label'}</label>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 7 }}>
                  {uploadType === 'bundle' ? 'Title of this piece — e.g. "New York"' : 'What buyers see — e.g. "Colour", "Black & White"'}
                </p>
                <input className={`form-input${shaking ? ' shake' : ''}`}
                  value={editingPiece.label}
                  onChange={e => updatePiece(editingIdx, { label: e.target.value })}
                  placeholder={uploadType === 'bundle' ? 'e.g. New York' : 'e.g. Colour version'} />
              </div>
              <Divider />
            </>
          )}

          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Hi-res print file</p>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 9 }}>Private — never shown to buyers</p>
          <div className="upload-zone"
            onClick={() => !editingPiece.hiresFile && document.getElementById(`hires-${editingIdx}`)?.click()}
            style={{ border: '0.25px solid var(--color-border)', borderRadius: 9, padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <span style={{ fontSize: 18 }}>🖨</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: editingPiece.hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)', transition: 'color 0.2s ease' }}>
                {editingPiece.hiresFile ? editingPiece.hiresFile.name : 'Tap to upload hi-res file'}
              </p>
              {editingPiece.hiresFile && <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{(editingPiece.hiresFile.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
            {editingPiece.hiresFile && (
              <button onClick={e => { e.stopPropagation(); updatePiece(editingIdx, { hiresFile: null }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16, padding: '0 3px' }}>×</button>
            )}
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 18 }}>JPG or PNG · A4 min 2339×1654px · A3 min 3307×2339px · up to 35 MB</p>
          <input type="file" id={`hires-${editingIdx}`} accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) updatePiece(editingIdx, { hiresFile: e.target.files[0] }) }} />

          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Preview images</p>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 9 }}>
            {uploadType === 'variant' ? 'First image is the storefront image for this variant.' : 'Add your watermark before uploading.'}
          </p>
          <ImageSlots
            files={editingPiece.imageFiles} thumbs={editingPiece.imageThumbs}
            activeSlot={activeSlot} slotPrefix={`piece-${editingIdx}`}
            onSelect={(si, f) => handleImageSelect(editingIdx, si, f)}
            onClear={si => clearImageSlot(editingIdx, si)}
            onSetActive={setActiveSlot}
          />

          <Divider />

          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={editingPiece.artTitle}
              onChange={e => updatePiece(editingIdx, { artTitle: e.target.value })}
              placeholder={uploadType === 'variant' ? `e.g. ${seriesName} — Colour` : 'Name your artwork'} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={editingPiece.description}
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

          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 7 }}>Print sizes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
            {SIZES.map(({ size, dims, comingSoon }) => (
              <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '0.25px solid var(--color-border)', borderRadius: 9, cursor: comingSoon ? 'not-allowed' : 'pointer', opacity: comingSoon ? 0.4 : 1, background: editingPiece.sizes.includes(size) && !comingSoon ? 'var(--color-surface)' : 'transparent', transition: 'background 0.15s ease' }}>
                <input type="checkbox" checked={!comingSoon && editingPiece.sizes.includes(size)} disabled={comingSoon}
                  onChange={() => {
                    if (comingSoon) return
                    const next = editingPiece.sizes.includes(size)
                      ? editingPiece.sizes.filter(s => s !== size)
                      : [...editingPiece.sizes, size]
                    updatePiece(editingIdx, { sizes: next })
                  }} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>
                    {size} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 11 }}>({dims})</span>
                    {comingSoon && <span style={{ fontSize: 9, marginLeft: 7, background: '#FAEEDA', color: '#633806', padding: '1px 6px', borderRadius: 20 }}>Coming soon</span>}
                  </p>
                  {!comingSoon && <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>Base printing fee: {formatMVR(PRINTING_FEES[size] || 0)}</p>}
                </div>
              </label>
            ))}
          </div>

          <Divider />

          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>Paper type</p>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 10 }}>All prints on Hahnemühle archival papers.</p>
          <PaperSelector
            value={editingPiece.paperType || getDefaultPaper(uploadType === 'single' ? singleCategory : seriesCategory)}
            onChange={v => updatePiece(editingIdx, { paperType: v })}
            category={uploadType === 'single' ? singleCategory : seriesCategory}
            onViewDetail={setDetailPaper}
          />

          <Divider />

          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>Your price (MVR)</p>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 9 }}>We add 5% platform fee + printing costs on top.</p>
          <input className="form-input" type="number" value={editingPiece.price}
            onChange={e => updatePiece(editingIdx, { price: e.target.value })}
            placeholder="e.g. 800" style={{ maxWidth: 150, marginBottom: 10 }} />
          <PriceBreakdown
            price={parseInt(editingPiece.price) || 0}
            sizes={editingPiece.sizes}
            paperType={editingPiece.paperType || getDefaultPaper(uploadType === 'single' ? singleCategory : seriesCategory)}
          />

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500 }}>Limited edition</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold.</p>
            </div>
            <Toggle on={editingPiece.isLimited} onToggle={() => updatePiece(editingIdx, { isLimited: !editingPiece.isLimited })} />
          </div>
          {editingPiece.isLimited && (
            <div className="fade-up" style={{ background: 'var(--color-surface)', border: '0.25px solid var(--color-border)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
              <label className="form-label" style={{ marginBottom: 5 }}>Edition size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <input className="form-input" type="number" min="1" max="999"
                  value={editingPiece.editionSize}
                  onChange={e => updatePiece(editingIdx, { editionSize: e.target.value })}
                  style={{ maxWidth: 90 }} />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>prints</span>
              </div>
            </div>
          )}

          {uploadType === 'variant' && (
            <>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>Show on storefront</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>Only one variant per series appears on the storefront grid.</p>
                </div>
                <Toggle on={editingPiece.isPrimary} onToggle={() => updatePiece(editingIdx, { isPrimary: !editingPiece.isPrimary })} />
              </div>
            </>
          )}

          <Divider />

          <div style={{ background: 'var(--color-surface)', borderRadius: 9, padding: '9px 13px', marginBottom: 18 }}>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, marginTop: 2 }}>FP-{profile.artist_code}-••• next available</p>
          </div>

          <button className="btn btn-primary btn-full btn-upload" onClick={handlePieceDone} disabled={submitting}>
            {submitting ? 'Saving...' : uploadType === 'single' ? 'Continue to review' : 'Done'}
          </button>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && (
        <div className={animClass}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontSize: 12, padding: 0, marginBottom: 14 }}>← Back</button>
          <StepProgress step={step} type={uploadType} />
          <SectionTitle title="Ready to submit?" sub="Review everything before sending for approval." />

          {uploadType !== 'single' && (
            <>
              {[
                ['Type', uploadType === 'bundle' ? 'Bundle' : 'Variants'],
                [uploadType === 'bundle' ? 'Collection' : 'Series', seriesName],
                ['Category', seriesCategory],
                ...(uploadType === 'bundle' && bundlePrice ? [['Bundle price', formatMVR(parseInt(bundlePrice))]] : []),
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.25px solid var(--color-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </>
          )}

          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
              {uploadType === 'single' ? 'Artwork' : uploadType === 'bundle' ? `Pieces (${doneCount})` : `Variants (${doneCount})`}
            </p>
            {pieces.filter(p => p.done).map((p, i) => (
              <div key={p.id} className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: 'var(--color-surface)', borderRadius: 10, marginBottom: 5 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: '#0F6E56' }}>✓</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{p.label || p.artTitle || `Piece ${i + 1}`}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.sku} · {formatMVR(parseInt(p.price))} · {p.sizes.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FAEEDA', border: '0.25px solid #EF9F27', borderRadius: 7, padding: '9px 13px', margin: '14px 0' }}>
            <p style={{ fontSize: 11, color: '#633806', lineHeight: 1.6 }}>Once submitted, our team reviews your artwork before it goes live. You'll be notified by email.</p>
          </div>

          <button className="btn btn-primary btn-full btn-upload" onClick={handleFinalSubmit}>Submit for review</button>
          <button className="btn btn-full btn-upload" onClick={goBack} style={{ marginTop: 9 }}>Make changes</button>
        </div>
      )}

      {detailPaper && <PaperDetailModal paper={detailPaper} onClose={() => setDetailPaper(null)} />}
    </div>
  )
}
