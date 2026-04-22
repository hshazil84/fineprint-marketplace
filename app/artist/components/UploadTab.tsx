'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
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
      const w = img.width
      const h = img.height
      const long = Math.max(w, h)
      const short = Math.min(w, h)
      if (sizes.includes('A3')) {
        if (long < 3307 || short < 2339) {
          resolve('For A3 printing, image must be at least 3307 x 2339 pixels. Your file is ' + w + ' x ' + h + ' px.')
          return
        }
      } else if (sizes.includes('A4')) {
        if (long < 2339 || short < 1654) {
          resolve('For A4 printing, image must be at least 2339 x 1654 pixels. Your file is ' + w + ' x ' + h + ' px.')
          return
        }
      }
      resolve(null)
    }
    img.onerror = () => resolve('Could not read image dimensions. Please upload a JPG or PNG file.')
    img.src = URL.createObjectURL(file)
  })
}

export function UploadTab({ profile, nextSeq, onSuccess }: any) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Photography',
    paintingBy: '',
  })
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['A4', 'A3'])
  const [hiresFile, setHiresFile] = useState<File | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewThumb, setPreviewThumb] = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<(File | null)[]>([null, null, null])
  const [galleryThumbs, setGalleryThumbs] = useState<(string | null)[]>([null, null, null])
  const [activeThumb, setActiveThumb] = useState<number>(0)
  const [uploading, setUploading] = useState(false)

  const nextSku = 'FP-' + profile?.artist_code + '-' + String(nextSeq).padStart(3, '0')
  const price = parseInt(form.price) || 0
  const platformFeeAmt = Math.round(price * PLATFORM_FEE / 100)
  const artistEarns = price - platformFeeAmt

  function toggleSize(size: string) {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  function handlePreviewSelect(file: File | null) {
    setPreviewFile(file)
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => {
        setPreviewThumb(ev.target?.result as string)
        setActiveThumb(0)
      }
      reader.readAsDataURL(file)
    }
  }

  function clearPreview() {
    setPreviewFile(null)
    setPreviewThumb(null)
    if (activeThumb === 0) setActiveThumb(0)
  }

  function handleGallerySelect(index: number, file: File | null) {
    if (!file) return
    const newFiles = [...galleryFiles]
    newFiles[index] = file
    setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = ev => {
      const newThumbs = [...galleryThumbs]
      newThumbs[index] = ev.target?.result as string
      setGalleryThumbs(newThumbs)
      setActiveThumb(index + 1)
    }
    reader.readAsDataURL(file)
  }

  function clearGallerySlot(index: number) {
    const newFiles = [...galleryFiles]
    const newThumbs = [...galleryThumbs]
    newFiles[index] = null
    newThumbs[index] = null
    setGalleryFiles(newFiles)
    setGalleryThumbs(newThumbs)
    if (activeThumb === index + 1) setActiveThumb(0)
  }

  // What shows in the big preview
  const bigImage = activeThumb === 0
    ? previewThumb
    : galleryThumbs[activeThumb - 1]

  async function handleUpload() {
    if (!form.title) { toast.error('Please fill in the title'); return }
    if (!form.price || price < 1) { toast.error('Please set a price'); return }
    if (selectedSizes.length === 0) { toast.error('Please select at least one print size'); return }
    if (!hiresFile) { toast.error('Please upload your hi-res print file'); return }
    if (!previewFile) { toast.error('Please upload a preview image for buyers'); return }

    const dimError = await validateHiRes(hiresFile, selectedSizes)
    if (dimError) { toast.error(dimError); return }

    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: prof } = await supabase.from('profiles').select('artist_code, full_name').eq('id', user.id).single()
      if (!prof?.artist_code) throw new Error('Artist code not found — please contact support')

      const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', user.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const sku = 'FP-' + prof.artist_code + '-' + seq

      toast.loading('Uploading hi-res file...', { id: 'upload' })
      const hiresExt = hiresFile.name.split('.').pop()
      const hiresPath = sku + '-hires.' + hiresExt
      const { error: hiresError } = await supabase.storage.from('artwork-hires').upload(hiresPath, hiresFile, { contentType: hiresFile.type })
      if (hiresError) throw hiresError

      toast.loading('Uploading preview image...', { id: 'upload' })
      const previewExt = previewFile.name.split('.').pop()
      const previewPath = sku + '-preview.' + previewExt
      const { error: previewError } = await supabase.storage.from('artwork-previews').upload(previewPath, previewFile, { contentType: previewFile.type })
      if (previewError) throw previewError

      const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)

      toast.loading('Saving listing...', { id: 'upload' })
      const { data: artwork, error: dbError } = await supabase.from('artworks').insert({
        sku,
        artist_id: user.id,
        title: form.title,
        description: form.description,
        price,
        hires_path: hiresPath,
        preview_url: urlData.publicUrl,
        sizes: selectedSizes,
        status: 'pending',
        category: form.category,
        painting_by: form.paintingBy || null,
      }).select().single()
      if (dbError) throw dbError

      // Upload gallery images
      const hasGallery = galleryFiles.some(Boolean)
      if (hasGallery && artwork) {
        toast.loading('Uploading gallery images...', { id: 'upload' })
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i]
          if (!gFile) continue
          const gExt = gFile.name.split('.').pop()
          const gPath = 'gallery/' + sku + '-gallery-' + (i + 1) + '.' + gExt
          const { error: gError } = await supabase.storage
            .from('artwork-previews')
            .upload(gPath, gFile, { contentType: gFile.type })
          if (gError) { console.error('Gallery upload error:', gError); continue }
          const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
          await supabase.from('artwork_images').insert({
            artwork_id: artwork.id,
            url: gUrl.publicUrl,
            sort_order: i + 1,
          })
        }
      }

      await fetch('/api/notify/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, title: form.title, artistName: prof.full_name, price, sizes: selectedSizes }),
      })

      toast.success('Artwork submitted! SKU: ' + sku, { id: 'upload' })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, { id: 'upload' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Upload new artwork</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Upload both your hi-res print file and a watermarked preview for buyers.
      </p>

      {/* Hi-res file */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        Hi-res print file
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>private, for printing only</span>
      </p>
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div
          style={{ border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          onClick={() => !hiresFile && document.getElementById('hires-input')?.click()}
        >
          <span style={{ fontSize: 20 }}>🖨</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: hiresFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {hiresFile ? hiresFile.name : 'Tap to upload hi-res file'}
            </p>
            {hiresFile && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {(hiresFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
          {hiresFile ? (
            <button
              onClick={e => { e.stopPropagation(); setHiresFile(null); (document.getElementById('hires-input') as HTMLInputElement).value = '' }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
              title="Remove file"
            >×</button>
          ) : null}
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
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        JPG or PNG · A4 min 2339 x 1654 px · A3 min 3307 x 2339 px (200 DPI) · up to 35 MB
      </p>
      <input type="file" id="hires-input" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setHiresFile(e.target.files[0]) }} />

      {/* ── ARTWORK PREVIEW — mirrors how it looks on artwork page ── */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        Preview image
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>shown to buyers — add your watermark first</span>
      </p>

      {/* Big main image slot */}
      <div
        style={{
          border: bigImage ? 'none' : '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 8,
          position: 'relative',
          aspectRatio: '4/3',
          background: 'var(--color-surface)',
          cursor: bigImage ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => !bigImage && document.getElementById('preview-input')?.click()}
      >
        {bigImage ? (
          <>
            <img
              src={bigImage}
              alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
            />
            {/* Clear button for currently active image */}
            {activeThumb === 0 && previewThumb && (
              <button
                onClick={e => { e.stopPropagation(); clearPreview() }}
                style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                title="Remove image"
              >×</button>
            )}
            {activeThumb > 0 && galleryThumbs[activeThumb - 1] && (
              <button
                onClick={e => { e.stopPropagation(); clearGallerySlot(activeThumb - 1) }}
                style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                title="Remove image"
              >×</button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>+</div>
            <p style={{ fontSize: 12 }}>Tap to upload main preview</p>
          </div>
        )}
      </div>

      {/* Change link for main preview */}
      {previewThumb && activeThumb === 0 && (
        <button
          onClick={() => document.getElementById('preview-input')?.click()}
          style={{ fontSize: 11, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', display: 'block' }}
        >
          Change main image
        </button>
      )}
      <input type="file" id="preview-input" accept="image/*" style={{ display: 'none' }} onChange={e => handlePreviewSelect(e.target.files?.[0] || null)} />

      {/* Thumbnail strip — 3 optional gallery slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 6 }}>
        {[0, 1, 2].map(i => {
          const thumb = galleryThumbs[i]
          const isActive = activeThumb === i + 1
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  if (thumb) {
                    setActiveThumb(i + 1)
                  } else {
                    document.getElementById('gallery-input-' + i)?.click()
                  }
                }}
                style={{
                  aspectRatio: '4/3',
                  borderRadius: 'var(--radius-md)',
                  border: isActive
                    ? '2px solid #1a1a1a'
                    : thumb
                    ? '0.5px solid var(--color-border)'
                    : '0.5px dashed var(--color-border-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface)',
                  transition: 'border-color 0.15s',
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={'gallery ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : (
                  <span style={{ fontSize: 18, color: 'var(--color-border-md)' }}>+</span>
                )}
              </div>
              {/* Remove button */}
              {thumb && (
                <button
                  onClick={e => { e.stopPropagation(); clearGallerySlot(i) }}
                  style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  title="Remove"
                >×</button>
              )}
              <input
                type="file"
                id={'gallery-input-' + i}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleGallerySelect(i, e.target.files?.[0] || null)}
              />
            </div>
          )
        })}
      </div>

      {/* Optional label + tip */}
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        Optional · tap a slot to add gallery images
      </p>
      <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          💡 <strong>Tip:</strong> Artworks with room mockups and close-up shots sell significantly better.
          Show buyers how your print looks framed on a wall — it makes all the difference!
        </p>
      </div>

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
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>optional, if you represent another artist</span>
        </label>
        <input className="form-input" value={form.paintingBy} onChange={e => setForm({ ...form, paintingBy: e.target.value })} placeholder="e.g. Ahmed Naif" />
      </div>

      {/* Print sizes */}
      {[
        { size: 'A4', dims: '210 x 297 mm', fee: PRINTING_FEES['A4'], comingSoon: false },
        { size: 'A3', dims: '297 x 420 mm', fee: PRINTING_FEES['A3'], comingSoon: false },
        { size: 'A2', dims: '420 x 594 mm', fee: 0, comingSoon: true },
      ].map(({ size, dims, fee, comingSoon }) => (
        <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: comingSoon ? 'not-allowed' : 'pointer', padding: '10px 14px', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: comingSoon ? 'rgba(0,0,0,0.02)' : selectedSizes.includes(size) ? 'var(--color-surface)' : 'transparent', opacity: comingSoon ? 0.5 : 1 }}>
          <input type="checkbox" checked={!comingSoon && selectedSizes.includes(size)} onChange={() => !comingSoon && toggleSize(size)} disabled={comingSoon} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>
              {size} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>({dims})</span>
              {comingSoon && <span style={{ fontSize: 10, marginLeft: 8, background: 'var(--color-amber-light)', color: '#633806', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Coming soon</span>}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {comingSoon ? 'Available soon' : 'Printing fee: ' + formatMVR(fee) + ' added to buyer price'}
            </p>
          </div>
        </label>
      ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="form-group">
        <label className="form-label">Your artwork price (MVR)</label>
        <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 800" style={{ maxWidth: 160 }} />
        {price > 0 && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>What buyers pay</p>
            {selectedSizes.map(size => (
              <div key={size} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: 'var(--color-text-muted)' }}>
                <span>{size} (incl. printing + delivery)</span>
                <span>{formatMVR(price + PRINTING_FEES[size] + 100)}</span>
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid var(--color-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: '#1D9E75' }}>
              <span>You earn (after 5% platform fee)</span>
              <span>{formatMVR(artistEarns)}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>SKU assigned on approval</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>{nextSku} next available</p>
      </div>

      <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>
    </div>
  )
}
