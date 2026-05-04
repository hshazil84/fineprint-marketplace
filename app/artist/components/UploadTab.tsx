'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers, CATEGORY_TO_BEST_FOR } from '@/lib/usePapers'
import { PaperDetailModal } from './PaperDetailModal'
import toast from 'react-hot-toast'

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
        if (long < 3307 || short < 2339) { resolve('For A3, image must be at least 3307 x 2339 px. Yours is ' + w + ' x ' + h + ' px.'); return }
      } else if (sizes.includes('A4')) {
        if (long < 2339 || short < 1654) { resolve('For A4, image must be at least 2339 x 1654 px. Yours is ' + w + ' x ' + h + ' px.'); return }
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

function InheritRow({ label, value, inherited, onToggle }: { label: string; value: string; inherited: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text)' }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {inherited ? 'From series: ' + value : 'Custom'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{inherited ? 'Inherit' : 'Override'}</span>
        <Toggle on={!inherited} onToggle={onToggle} />
      </div>
    </div>
  )
}

export function UploadTab({ profile, nextSeq, onSuccess }: any) {
  const { papers, loading: papersLoading, getPapersByCategory, getPaperAddOn, getDefaultPaper } = usePapers()

  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'Photography', paintingBy: '' })
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['A4', 'A3'])
  const [paperType, setPaperType]         = useState<string>('')
  const [isLimited, setIsLimited]         = useState(false)
  const [editionSize, setEditionSize]     = useState<string>('50')
  const [hiresFile, setHiresFile]         = useState<File | null>(null)

  const [imageFiles, setImageFiles]     = useState<(File | null)[]>([null, null, null])
  const [imageThumbs, setImageThumbs]   = useState<(string | null)[]>([null, null, null])
  const [activeSlot, setActiveSlot]     = useState<number>(0)

  const [isSeries, setIsSeries]                 = useState(false)
  const [seriesMode, setSeriesMode]             = useState<'new' | 'existing'>('new')
  const [newSeriesName, setNewSeriesName]       = useState('')
  const [existingSeries, setExistingSeries]     = useState<any[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [seriesLabel, setSeriesLabel]           = useState('')
  const [isPrimary, setIsPrimary]               = useState(true)
  const [primaryArtwork, setPrimaryArtwork]     = useState<any>(null)

  // Inheritance toggles (true = inherit from series, false = override)
  const [inheritPrice, setInheritPrice]   = useState(true)
  const [inheritSizes, setInheritSizes]   = useState(true)
  const [inheritPaper, setInheritPaper]   = useState(true)

  const [uploading, setUploading]     = useState(false)
  const [detailPaper, setDetailPaper] = useState<any>(null)

  const supabase = createClient()

  const effectivePaperType = paperType || getDefaultPaper(form.category)
  const nextSku            = 'FP-' + profile?.artist_code + '-' + String(nextSeq).padStart(3, '0')
  const price              = parseInt(form.price) || 0
  const platformFeeAmt     = Math.round(price * 5 / 100)
  const papersByCategory   = getPapersByCategory()
  const selectedPaper      = papers.find(p => p.name === effectivePaperType)
  const bestForKey         = CATEGORY_TO_BEST_FOR[form.category]

  // Resolved values — either own or inherited from series primary
  const resolvedPrice = (isSeries && seriesMode === 'existing' && inheritPrice && primaryArtwork)
    ? primaryArtwork.price : price
  const resolvedSizes = (isSeries && seriesMode === 'existing' && inheritSizes && primaryArtwork)
    ? primaryArtwork.sizes : selectedSizes
  const resolvedPaper = (isSeries && seriesMode === 'existing' && inheritPaper && primaryArtwork)
    ? primaryArtwork.paper_type : effectivePaperType

  useEffect(() => {
    if (isSeries && seriesMode === 'existing') fetchExistingSeries()
  }, [isSeries, seriesMode])

  useEffect(() => {
    if (selectedSeriesId) fetchPrimaryArtwork(selectedSeriesId)
    else setPrimaryArtwork(null)
  }, [selectedSeriesId])

  async function fetchExistingSeries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('artwork_series')
      .select('id, name, primary_artwork_id')
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false })
    setExistingSeries(data || [])
  }

  async function fetchPrimaryArtwork(seriesId: string) {
    const { data: series } = await supabase
      .from('artwork_series')
      .select('primary_artwork_id')
      .eq('id', seriesId)
      .single()
    if (!series?.primary_artwork_id) { setPrimaryArtwork(null); return }
    const { data: artwork } = await supabase
      .from('artworks')
      .select('price, sizes, paper_type, title')
      .eq('id', series.primary_artwork_id)
      .single()
    setPrimaryArtwork(artwork || null)
  }

  function toggleSize(size: string) {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])
  }

  function handleImageSelect(slotIdx: number, file: File | null) {
    if (!file) return
    const newFiles = [...imageFiles]; newFiles[slotIdx] = file; setImageFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...imageThumbs]; newThumbs[slotIdx] = ev.target?.result as string
      setImageThumbs(newThumbs); setActiveSlot(slotIdx)
    }
    reader.readAsDataURL(file)
  }

  function clearImageSlot(slotIdx: number) {
    const newFiles  = [...imageFiles];  newFiles[slotIdx]  = null; setImageFiles(newFiles)
    const newThumbs = [...imageThumbs]; newThumbs[slotIdx] = null; setImageThumbs(newThumbs)
    if (activeSlot === slotIdx) setActiveSlot(0)
  }

  async function handleUpload() {
    if (!form.title)                { toast.error('Please fill in the title'); return }
    if (!imageFiles[0])             { toast.error('Please upload a main preview image'); return }
    if (!hiresFile)                 { toast.error('Please upload your hi-res print file'); return }
    if (resolvedSizes.length === 0) { toast.error('Please select at least one print size'); return }
    if (!inheritPrice && (!form.price || price < 1)) { toast.error('Please set a price'); return }
    if (isSeries && seriesMode === 'new' && !newSeriesName.trim()) { toast.error('Please enter a series name'); return }
    if (isSeries && seriesMode === 'existing' && !selectedSeriesId) { toast.error('Please select a series'); return }
    if (isSeries && !seriesLabel.trim()) { toast.error('Please enter a variant label'); return }
    if (isLimited && (!editionSize || parseInt(editionSize) < 1)) { toast.error('Please set a valid edition size'); return }

    const dimError = await validateHiRes(hiresFile, resolvedSizes)
    if (dimError) { toast.error(dimError); return }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: prof } = await supabase.from('profiles').select('artist_code, full_name').eq('id', user.id).single()
      if (!prof?.artist_code) throw new Error('Artist code not found')

      const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', user.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const sku = 'FP-' + prof.artist_code + '-' + seq

      toast.loading('Uploading hi-res file...', { id: 'upload' })
      const hiresExt  = hiresFile.name.split('.').pop()
      const hiresPath = sku + '-hires.' + hiresExt
      const { error: hiresError } = await supabase.storage.from('artwork-hires').upload(hiresPath, hiresFile, { contentType: hiresFile.type, upsert: true })
      if (hiresError) throw hiresError

      toast.loading('Uploading preview...', { id: 'upload' })
      const previewFile = imageFiles[0]!
      const previewExt  = previewFile.name.split('.').pop()
      const previewPath = sku + '-preview.' + previewExt
      const { error: previewError } = await supabase.storage.from('artwork-previews').upload(previewPath, previewFile, { contentType: previewFile.type, upsert: true })
      if (previewError) throw previewError
      const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)

      let seriesId: string | null = null
      if (isSeries) {
        if (seriesMode === 'new') {
          const { data: newSeries, error: seriesError } = await supabase
            .from('artwork_series')
            .insert({ name: newSeriesName.trim(), artist_id: user.id })
            .select()
            .single()
          if (seriesError) throw seriesError
          seriesId = newSeries.id
        } else {
          seriesId = selectedSeriesId
        }
      }

      toast.loading('Saving listing...', { id: 'upload' })
      const { data: artwork, error: dbError } = await supabase.from('artworks').insert({
        sku,
        artist_id:     user.id,
        title:         form.title,
        description:   form.description,
        price:         resolvedPrice,
        hires_path:    hiresPath,
        preview_url:   urlData.publicUrl,
        sizes:         resolvedSizes,
        status:        'pending',
        category:      form.category,
        painting_by:   form.paintingBy || null,
        paper_type:    resolvedPaper,
        edition_size:  isLimited ? parseInt(editionSize) : null,
        editions_sold: 0,
        series_id:     seriesId,
        series_label:  isSeries ? seriesLabel.trim() : null,
      }).select().single()
      if (dbError) throw dbError

      if (isSeries && isPrimary && seriesId) {
        await supabase.from('artwork_series').update({ primary_artwork_id: artwork.id }).eq('id', seriesId)
      }

      toast.loading('Uploading gallery...', { id: 'upload' })
      for (let i = 1; i <= 2; i++) {
        const gFile = imageFiles[i]
        if (!gFile) continue
        const gExt  = gFile.name.split('.').pop()
        const gPath = 'gallery/' + sku + '-gallery-' + i + '.' + gExt
        const { error: gError } = await supabase.storage.from('artwork-previews').upload(gPath, gFile, { contentType: gFile.type })
        if (gError) { console.error(gError); continue }
        const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
        await supabase.from('artwork_images').insert({ artwork_id: artwork.id, url: gUrl.publicUrl, sort_order: i })
      }

      await fetch('/api/notify/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, title: form.title, artistName: prof.full_name, price: resolvedPrice, sizes: resolvedSizes }),
      })

      toast.success('Submitted for review · SKU: ' + sku, { id: 'upload' })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, { id: 'upload' })
    } finally {
      setUploading(false)
    }
  }

  const showPricingSection = !isSeries || seriesMode === 'new' || !inheritPrice || !primaryArtwork
  const showSizesSection   = !isSeries || seriesMode === 'new' || !inheritSizes || !primaryArtwork
  const showPaperSection   = !isSeries || seriesMode === 'new' || !inheritPaper || !primaryArtwork

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>Upload new artwork</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Upload your hi-res print file and preview images for buyers.
      </p>

      {/* HI-RES FILE */}
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
            <button onClick={e => { e.stopPropagation(); setHiresFile(null); (document.getElementById('hires-input') as HTMLInputElement).value = '' }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
          )}
        </div>
        {hiresFile && (
          <button onClick={() => document.getElementById('hires-input')?.click()}
            style={{ fontSize: 11, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'block' }}>
            Change file
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        JPG or PNG · A4 min 2339 x 1654 px · A3 min 3307 x 2339 px · up to 35 MB
      </p>
      <input type="file" id="hires-input" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />

      {/* PREVIEW IMAGES */}
      <SectionLabel hint="Shown to buyers. First image appears on the storefront. Add your watermark before uploading.">
        Preview images
      </SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        {[0, 1, 2].map(slotIdx => {
          const thumb    = imageThumbs[slotIdx]
          const isActive = activeSlot === slotIdx && !!thumb
          const inputId  = 'image-input-' + slotIdx
          return (
            <div key={slotIdx} style={{ position: 'relative' }}>
              <div
                onClick={() => { if (thumb) setActiveSlot(slotIdx); else document.getElementById(inputId)?.click() }}
                style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', border: isActive ? '2px solid #1a1a1a' : thumb ? '0.5px solid var(--color-border)' : '0.5px dashed var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border-color 0.15s' }}
              >
                {thumb ? (
                  <img src={thumb} alt={'Slot ' + (slotIdx + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: 22, marginBottom: 2 }}>+</div>
                    <p style={{ fontSize: 10 }}>{slotIdx === 0 ? 'Main image' : 'Add image'}</p>
                  </div>
                )}
                {slotIdx === 0 && thumb && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 20 }}>Primary</div>
                )}
                {thumb && (
                  <button onClick={e => { e.stopPropagation(); clearImageSlot(slotIdx) }}
                    style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                )}
              </div>
              {thumb && (
                <button onClick={() => document.getElementById(inputId)?.click()}
                  style={{ fontSize: 10, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', display: 'block', width: '100%', textAlign: 'center' }}>
                  Change
                </button>
              )}
              <input type="file" id={inputId} accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(slotIdx, e.target.files?.[0] || null)} />
            </div>
          )
        })}
      </div>

      {imageThumbs[activeSlot] && (
        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface)', marginBottom: 10, border: '0.5px solid var(--color-border)' }}>
          <img src={imageThumbs[activeSlot]!} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'contain', pointerEvents: 'none' }} />
        </div>
      )}

      <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>Artworks with room mockups and close-up detail shots sell significantly better.</p>
      </div>

      <Divider />

      {/* ARTWORK DETAILS */}
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
        <select className="form-input" value={form.category} onChange={e => { setForm({ ...form, category: e.target.value }); setPaperType('') }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Painting by <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>optional</span></label>
        <input className="form-input" value={form.paintingBy} onChange={e => setForm({ ...form, paintingBy: e.target.value })} placeholder="e.g. Ahmed Naif" />
      </div>

      <Divider />

      {/* SERIES SECTION — shown early so inheritance can collapse below sections */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Part of a series?</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Link this artwork with related variants — e.g. same subject, different mood or colour.</p>
          </div>
          <Toggle on={isSeries} onToggle={() => setIsSeries(v => !v)} />
        </div>

        {isSeries && (
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setSeriesMode('new')} className="btn"
                style={seriesMode === 'new' ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)', fontSize: 12 } : { fontSize: 12 }}>
                Create new series
              </button>
              <button onClick={() => setSeriesMode('existing')} className="btn"
                style={seriesMode === 'existing' ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)', fontSize: 12 } : { fontSize: 12 }}>
                Add to existing
              </button>
            </div>

            {seriesMode === 'new' ? (
              <div className="form-group">
                <label className="form-label">Series name</label>
                <input className="form-input" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)} placeholder="e.g. Eiffel Tower, Maldives Sunsets" />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Select series</label>
                <select className="form-input" value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}>
                  <option value="">— choose a series —</option>
                  {existingSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Variant label</label>
              <input className="form-input" value={seriesLabel} onChange={e => setSeriesLabel(e.target.value)} placeholder="e.g. Sunset, Blue, Version 1" />
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>This is what buyers see when choosing between variants.</p>
            </div>

            {/* Inheritance toggles — only shown when adding to existing series with a primary */}
            {seriesMode === 'existing' && primaryArtwork && (
              <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Inherit from series</p>
                <InheritRow
                  label="Price"
                  value={formatMVR(primaryArtwork.price)}
                  inherited={inheritPrice}
                  onToggle={() => setInheritPrice(v => !v)}
                />
                <InheritRow
                  label="Sizes"
                  value={(primaryArtwork.sizes || []).join(', ')}
                  inherited={inheritSizes}
                  onToggle={() => setInheritSizes(v => !v)}
                />
                <InheritRow
                  label="Paper"
                  value={primaryArtwork.paper_type || 'Default'}
                  inherited={inheritPaper}
                  onToggle={() => setInheritPaper(v => !v)}
                />
              </div>
            )}

            {/* Primary toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTop: '0.5px solid var(--color-border)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>Show on storefront</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Only one variant per series appears on the storefront grid.</p>
              </div>
              <Toggle on={isPrimary} onToggle={() => setIsPrimary(v => !v)} />
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* PRINT SIZES — hidden if inherited */}
      {showSizesSection && (
        <>
          <SectionLabel hint="Select the sizes you will offer for this artwork.">Print sizes</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              { size: 'A4', dims: '210 x 297 mm', fee: PRINTING_FEES['A4'], comingSoon: false },
              { size: 'A3', dims: '297 x 420 mm', fee: PRINTING_FEES['A3'], comingSoon: false },
              { size: 'A2', dims: '420 x 594 mm', fee: 0,                   comingSoon: true  },
            ].map(({ size, dims, fee, comingSoon }) => (
              <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: comingSoon ? 'not-allowed' : 'pointer', padding: '10px 14px', border: '0.5px solid var(--color-border)', borderRadius: 10, background: selectedSizes.includes(size) && !comingSoon ? 'var(--color-surface)' : 'transparent', opacity: comingSoon ? 0.45 : 1 }}>
                <input type="checkbox" checked={!comingSoon && selectedSizes.includes(size)} onChange={() => !comingSoon && toggleSize(size)} disabled={comingSoon} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>
                    {size} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>({dims})</span>
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
        </>
      )}

      {/* PAPER TYPE — hidden if inherited */}
      {showPaperSection && (
        <>
          <SectionLabel hint="All prints are produced on Hahnemuhle archival papers.">Paper type</SectionLabel>
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              By default, all FinePrint Studio prints are produced on <strong>Hahnemuhle museum-grade archival papers</strong> at no extra cost.
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
                      const isRecommended = bestForKey && paper.best_for?.includes(bestForKey)
                      return (
                        <div key={paper.name} onClick={() => !isOutOfStock && setPaperType(paper.name)}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: isSelected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)', borderRadius: 10, cursor: isOutOfStock ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--color-surface)' : 'transparent', opacity: isOutOfStock ? 0.45 : 1, transition: 'all 0.15s' }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0, marginTop: 2, transition: 'all 0.15s' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <p style={{ fontSize: 13, fontWeight: 500 }}>{paper.name}</p>
                              {isRecommended && !isOutOfStock && <span style={{ fontSize: 10, background: '#185FA5', color: '#fff', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Recommended</span>}
                              {isOutOfStock && <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Out of stock</span>}
                              {!hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>Included</span>}
                              {hasPremium && !isOutOfStock && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>+{formatMVR(addOnA4)} A4 · +{formatMVR(addOnA3)} A3</span>}
                            </div>
                            <button onClick={e => { e.stopPropagation(); setDetailPaper(paper) }} style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', textDecoration: 'underline', display: 'block' }}>View details</button>
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
                {selectedPaper.name} adds a paper upgrade fee to the buyer's total. This does not affect your earnings.
              </p>
            </div>
          )}
          <Divider />
        </>
      )}

      {/* PRICING — hidden if inherited */}
      {showPricingSection && (
        <>
          <SectionLabel hint="Set the amount you want to receive. We add a 5% platform fee and print costs on top for buyers.">
            Your artwork price (MVR)
          </SectionLabel>
          <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 800" style={{ maxWidth: 160, marginBottom: 10 }} />
          {price > 0 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 10 }}>Price breakdown</p>
              {selectedSizes.map(size => {
                const addOn   = getPaperAddOn(effectivePaperType, size)
                const baseFee = PRINTING_FEES[size] || 200
                const total   = price + Math.round(price * 5 / 100) + baseFee + addOn + 100
                return (
                  <div key={size} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                      <span>{size} — Artwork + platform fee</span><span>{formatMVR(price + Math.round(price * 5 / 100))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                      <span>{size} — Printing</span><span>{formatMVR(baseFee)}</span>
                    </div>
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
                <span>You earn</span><span>{formatMVR(price)}</span>
              </div>
            </div>
          )}
          <Divider />
        </>
      )}

      {/* Inherited values summary */}
      {isSeries && seriesMode === 'existing' && primaryArtwork && (inheritPrice || inheritSizes || inheritPaper) && (
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inherited from series</p>
          {inheritPrice && <p style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 4 }}>Price: <strong>{formatMVR(primaryArtwork.price)}</strong></p>}
          {inheritSizes && <p style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 4 }}>Sizes: <strong>{(primaryArtwork.sizes || []).join(', ')}</strong></p>}
          {inheritPaper && <p style={{ fontSize: 13, color: 'var(--color-text)' }}>Paper: <strong>{primaryArtwork.paper_type || 'Default'}</strong></p>}
        </div>
      )}

      {/* LIMITED EDITION */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Limited edition</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Cap how many prints can be sold. Creates scarcity and value.</p>
          </div>
          <Toggle on={isLimited} onToggle={() => setIsLimited(v => !v)} />
        </div>
        {isLimited && (
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
            <label className="form-label" style={{ marginBottom: 6 }}>Edition size</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input className="form-input" type="number" min="1" max="999" value={editionSize} onChange={e => setEditionSize(e.target.value)} style={{ maxWidth: 100 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>prints</span>
            </div>
          </div>
        )}
      </div>

      {/* SKU PREVIEW */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>{nextSku} next available</p>
      </div>

      <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>

      {detailPaper && <PaperDetailModal paper={detailPaper} onClose={() => setDetailPaper(null)} />}
    </div>
  )
}
