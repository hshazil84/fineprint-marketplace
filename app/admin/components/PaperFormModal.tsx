'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BarcodeImage } from './BarcodeImage'
import toast from 'react-hot-toast'

export interface Paper {
  id: number
  paper_id: string
  name: string
  category: string
  weight_gsm: number | null
  description: string | null
  barcode: string | null
  add_on_a4: number
  add_on_a3: number
  add_on_a2: number
  stock_status: string
  stock_qty_a4: number
  stock_qty_a3: number
  stock_qty_a2: number
  stock_low_threshold: number
  wastage_pct: number
  stock_note: string | null
  sort_order: number
  images: string[]
  datasheet_url: string | null
  best_for: string[]
}

export const EMPTY_PAPER: Omit<Paper, 'id'> = {
  paper_id:            '',
  name:                '',
  category:            'standard',
  weight_gsm:          null,
  description:         null,
  barcode:             null,
  add_on_a4:           0,
  add_on_a3:           0,
  add_on_a2:           0,
  stock_status:        'in_stock',
  stock_qty_a4:        0,
  stock_qty_a3:        0,
  stock_qty_a2:        0,
  stock_low_threshold: 10,
  wastage_pct:         10,
  stock_note:          null,
  sort_order:          0,
  images:              [],
  datasheet_url:       null,
  best_for:            [],
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const STOCK_STATUS_OPTIONS = [
  { value: 'in_stock',     label: 'In stock',     color: '#0F6E56', bg: '#E1F5EE' },
  { value: 'low_stock',    label: 'Low stock',    color: '#633806', bg: '#FAEEDA' },
  { value: 'backorder',    label: 'Backorder',    color: '#185FA5', bg: '#E6F1FB' },
  { value: 'out_of_stock', label: 'Out of stock', color: '#A32D2D', bg: '#FCEBEB' },
]

const BEST_FOR_OPTIONS = [
  { value: 'photography',  label: 'Photography' },
  { value: 'digital_art',  label: 'Digital Art' },
  { value: 'fine_art',     label: 'Fine Art' },
  { value: 'watercolour',  label: 'Watercolour' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'charcoal',     label: 'Charcoal & Sketch' },
]

export function PaperFormModal({ paper, onClose, onSaved }: {
  paper: Paper | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm]           = useState<Omit<Paper, 'id'>>(paper ? { ...paper } : { ...EMPTY_PAPER })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      paper_id: paper ? f.paper_id : slugify(name),
    }))
  }

  function toggleBestFor(value: string) {
    setForm(f => ({
      ...f,
      best_for: f.best_for.includes(value)
        ? f.best_for.filter(v => v !== value)
        : [...f.best_for, value],
    }))
  }

  async function uploadImage(file: File) {
    if (!form.name) { toast.error('Enter a name first'); return }
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${form.paper_id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('papers').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('papers').getPublicUrl(path)
      setForm(f => ({ ...f, images: [...(f.images || []), data.publicUrl] }))
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function uploadDatasheet(file: File) {
    if (!form.name) { toast.error('Enter a name first'); return }
    setUploading(true)
    try {
      const path = `${form.paper_id}/datasheet.pdf`
      const { error } = await supabase.storage.from('papers').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('papers').getPublicUrl(path)
      setForm(f => ({ ...f, datasheet_url: data.publicUrl }))
      toast.success('Datasheet uploaded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) {
    setForm(f => ({ ...f, images: f.images.filter(i => i !== url) }))
  }

  async function handleSave() {
    if (!form.name) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = {
        paper_id:            form.paper_id,
        name:                form.name,
        category:            form.category,
        weight_gsm:          form.weight_gsm,
        description:         form.description,
        barcode:             form.barcode,
        add_on_a4:           form.add_on_a4 || 0,
        add_on_a3:           form.add_on_a3 || 0,
        add_on_a2:           form.add_on_a2 || 0,
        stock_status:        form.stock_status,
        stock_qty_a4:        form.stock_qty_a4 || 0,
        stock_qty_a3:        form.stock_qty_a3 || 0,
        stock_qty_a2:        form.stock_qty_a2 || 0,
        stock_low_threshold: form.stock_low_threshold || 10,
        wastage_pct:         form.wastage_pct || 10,
        stock_note:          form.stock_note,
        sort_order:          form.sort_order || 0,
        images:              form.images || [],
        datasheet_url:       form.datasheet_url,
        best_for:            form.best_for || [],
        updated_at:          new Date().toISOString(),
      }

      if (paper) {
        const { error } = await supabase.from('papers').update(payload).eq('id', paper.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('papers').insert(payload)
        if (error) throw error
      }

      toast.success(paper ? 'Paper updated' : 'Paper added')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const effectiveA4 = Math.floor(form.stock_qty_a4 * (1 - (form.wastage_pct || 0) / 100))
  const effectiveA3 = Math.floor(form.stock_qty_a3 * (1 - (form.wastage_pct || 0) / 100))
  const effectiveA2 = Math.floor(form.stock_qty_a2 * (1 - (form.wastage_pct || 0) / 100))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{paper ? 'Edit paper' : 'Add paper'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name + auto paper_id */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Name <span style={{ color: '#A32D2D' }}>*</span></label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Photo Rag® Baryta"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Paper ID (auto)</label>
              <input
                className="form-input"
                value={form.paper_id}
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Tier + Weight */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Weight (GSM)</label>
              <input
                className="form-input"
                type="number"
                value={form.weight_gsm || ''}
                onChange={e => set('weight_gsm', parseInt(e.target.value) || null)}
                placeholder="e.g. 315"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Paper description..."
              style={{ minHeight: 80 }}
            />
          </div>

          {/* Best for */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Best for
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BEST_FOR_OPTIONS.map(opt => {
                const selected = form.best_for.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleBestFor(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: selected ? '1.5px solid #1a1a1a' : '0.5px solid var(--color-border)',
                      background: selected ? '#1a1a1a' : 'transparent',
                      color: selected ? '#fff' : 'var(--color-text-muted)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: selected ? 500 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {selected && <span style={{ fontSize: 10 }}>✓</span>}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Barcode */}
          <div className="form-group">
            <label className="form-label">Barcode (EAN)</label>
            <input
              className="form-input"
              value={form.barcode || ''}
              onChange={e => set('barcode', e.target.value)}
              placeholder="e.g. 4012386141881"
            />
            {form.barcode && (
              <div style={{ marginTop: 10 }}>
                <BarcodeImage value={form.barcode} width={160} />
              </div>
            )}
          </div>

          {/* Price addons */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Price add-ons (MVR)
            </p>
            <div className="grid-3">
              {[['add_on_a4', 'A4'], ['add_on_a3', 'A3'], ['add_on_a2', 'A2']].map(([field, label]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={(form as any)[field] || 0}
                    onChange={e => set(field, parseInt(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stock management */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Stock management
            </p>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Stock status</label>
              <select className="form-input" value={form.stock_status} onChange={e => set('stock_status', e.target.value)}>
                {STOCK_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Qty in stock per size (sheets):
            </p>
            <div className="grid-3" style={{ marginBottom: 10 }}>
              {([
                ['stock_qty_a4', 'A4', effectiveA4],
                ['stock_qty_a3', 'A3', effectiveA3],
                ['stock_qty_a2', 'A2', effectiveA2],
              ] as [string, string, number][]).map(([field, label, effective]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={(form as any)[field] || 0}
                    onChange={e => set(field, parseInt(e.target.value) || 0)}
                  />
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>
                    Effective: {effective}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label className="form-label">Low stock threshold (sheets)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.stock_low_threshold || 10}
                  onChange={e => set('stock_low_threshold', parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wastage buffer (%)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.wastage_pct || 10}
                  onChange={e => set('wastage_pct', parseInt(e.target.value) || 10)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stock note</label>
              <input
                className="form-input"
                value={form.stock_note || ''}
                onChange={e => set('stock_note', e.target.value)}
                placeholder="e.g. Next restock expected May"
              />
            </div>
          </div>

          {/* Sort order */}
          <div className="form-group">
            <label className="form-label">Sort order</label>
            <input
              className="form-input"
              type="number"
              value={form.sort_order || 0}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Images */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Images ({form.images?.length || 0}/3)
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {(form.images || []).map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--color-border)' }} />
                  <button
                    onClick={() => removeImage(url)}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#A32D2D', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>
              ))}
              {(form.images?.length || 0) < 3 && (
                <label style={{ width: 80, height: 80, border: '0.5px dashed var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: form.name ? 'pointer' : 'not-allowed', fontSize: 22, color: 'var(--color-text-muted)', opacity: form.name ? 1 : 0.4 }}>
                  +
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
                    disabled={uploading || !form.name}
                  />
                </label>
              )}
            </div>
            {!form.name && <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Enter a name first to enable image upload.</p>}
          </div>

          {/* Datasheet */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Datasheet (PDF)
            </p>
            {form.datasheet_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a href={form.datasheet_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#0F6E56' }}>
                  View datasheet
                </a>
                <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => set('datasheet_url', null)}>Remove</button>
              </div>
            ) : (
              <label className="btn btn-sm" style={{ cursor: form.name ? 'pointer' : 'not-allowed', display: 'inline-block', opacity: form.name ? 1 : 0.4 }}>
                Upload PDF
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadDatasheet(e.target.files[0])}
                  disabled={uploading || !form.name}
                />
              </label>
            )}
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-sm" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? 'Saving...' : uploading ? 'Uploading...' : paper ? 'Save changes' : 'Add paper'}
          </button>
        </div>

      </div>
    </div>
  )
}
