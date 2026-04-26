'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BarcodeImage } from './BarcodeImage'
import { Paper } from './PaperFormModal'
import toast from 'react-hot-toast'

const STOCK_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: 'In stock',     color: '#0F6E56', bg: '#E1F5EE' },
  low_stock:    { label: 'Low stock',    color: '#633806', bg: '#FAEEDA' },
  backorder:    { label: 'Backorder',    color: '#185FA5', bg: '#E6F1FB' },
  out_of_stock: { label: 'Out of stock', color: '#A32D2D', bg: '#FCEBEB' },
}

interface RestockModalProps {
  paper: Paper
  onClose: () => void
  onRestocked: () => void
}

function RestockModal({ paper, onClose, onRestocked }: RestockModalProps) {
  const [size, setSize]     = useState<'a4' | 'a3' | 'a2'>('a4')
  const [qty, setQty]       = useState(0)
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const currentQty = size === 'a4' ? paper.stock_qty_a4 : size === 'a3' ? paper.stock_qty_a3 : paper.stock_qty_a2
  const effectiveQty = Math.floor(currentQty * (1 - (paper.wastage_pct || 10) / 100))

  async function handleRestock() {
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }
    setSaving(true)
    try {
      const newQty = currentQty + qty
      const field  = `stock_qty_${size}`

      // Derive new stock status based on all sizes
      const newA4 = size === 'a4' ? newQty : paper.stock_qty_a4
      const newA3 = size === 'a3' ? newQty : paper.stock_qty_a3
      const newA2 = size === 'a2' ? newQty : paper.stock_qty_a2
      const minQty = Math.min(newA4, newA3, newA2)

      let newStatus = paper.stock_status
      if (minQty > paper.stock_low_threshold) newStatus = 'in_stock'
      else if (minQty > 0) newStatus = 'low_stock'
      else newStatus = 'out_of_stock'

      await supabase
        .from('papers')
        .update({
          [field]:      newQty,
          stock_status: newStatus,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', paper.id)

      await supabase
        .from('paper_stock_movements')
        .insert({
          paper_id:   paper.paper_id,
          change_qty: qty,
          reason:     'restock',
          print_size: size.toUpperCase(),
          notes:      notes || null,
        })

      toast.success(`Restocked ${qty} ${size.toUpperCase()} sheets — new total: ${newQty}`)
      onRestocked()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Restock — {paper.name}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {/* Current stock per size */}
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Current stock</p>
          {[
            ['A4', paper.stock_qty_a4],
            ['A3', paper.stock_qty_a3],
            ['A2', paper.stock_qty_a2],
          ].map(([s, q]) => (
            <p key={s as string} style={{ margin: '2px 0', color: 'var(--color-text-muted)' }}>
              {s as string}: <strong>{q as number} sheets</strong>
              {' '}(effective: {Math.floor((q as number) * (1 - (paper.wastage_pct || 10) / 100))})
            </p>
          ))}
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Size to restock</label>
          <select className="form-input" value={size} onChange={e => setSize(e.target.value as any)}>
            <option value="a4">A4</option>
            <option value="a3">A3</option>
            <option value="a2">A2</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Sheets to add</label>
          <input
            className="form-input"
            type="number"
            min={1}
            value={qty || ''}
            onChange={e => setQty(parseInt(e.target.value) || 0)}
            placeholder="e.g. 50"
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Notes (optional)</label>
          <input
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Supplier delivery April 2026"
          />
        </div>

        {qty > 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#0F6E56' }}>
            New {size.toUpperCase()} total: <strong>{currentQty + qty} sheets</strong>
            {' '}(effective: {Math.floor((currentQty + qty) * (1 - (paper.wastage_pct || 10) / 100))})
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-sm" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleRestock} disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? 'Saving...' : 'Confirm restock'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface StockHistoryModalProps {
  paper: Paper
  onClose: () => void
}

function StockHistoryModal({ paper, onClose }: StockHistoryModalProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useState(() => {
    supabase
      .from('paper_stock_movements')
      .select('*')
      .eq('paper_id', paper.paper_id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setMovements(data || [])
        setLoading(false)
      })
  })

  const reasonLabel: Record<string, string> = {
    order_approved:    'Order deduction',
    manual_adjustment: 'Manual adjustment',
    restock:           'Restock',
    wastage:           'Wastage write-off',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Stock history — {paper.name}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>Loading...</p>
        ) : movements.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>No movements recorded yet.</p>
        ) : (
          <div style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            {movements.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < movements.length - 1 ? '0.5px solid var(--color-border)' : 'none', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{reasonLabel[m.reason] || m.reason}</p>
                    {m.print_size && (
                      <span style={{ fontSize: 10, background: 'var(--color-background-secondary)', padding: '1px 6px', borderRadius: 10, color: 'var(--color-text-muted)' }}>
                        {m.print_size}
                      </span>
                    )}
                  </div>
                  {m.notes && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{m.notes}</p>}
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: m.change_qty > 0 ? '#0F6E56' : '#A32D2D', flexShrink: 0 }}>
                  {m.change_qty > 0 ? '+' : ''}{m.change_qty}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PaperRow({ paper, onEdit, onDelete, onRefresh }: {
  paper: Paper
  onEdit: (paper: Paper) => void
  onDelete: (paper: Paper) => void
  onRefresh: () => void
}) {
  const [showRestock, setShowRestock] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)

  const statusConfig = STOCK_STATUS_CONFIG[paper.stock_status] || STOCK_STATUS_CONFIG.in_stock
  const minQty       = Math.min(paper.stock_qty_a4, paper.stock_qty_a3, paper.stock_qty_a2)
  const isLow        = paper.stock_status === 'low_stock'
  const isOut        = paper.stock_status === 'out_of_stock'

  const effectiveA4 = Math.floor(paper.stock_qty_a4 * (1 - (paper.wastage_pct || 10) / 100))
  const effectiveA3 = Math.floor(paper.stock_qty_a3 * (1 - (paper.wastage_pct || 10) / 100))
  const effectiveA2 = Math.floor(paper.stock_qty_a2 * (1 - (paper.wastage_pct || 10) / 100))

  return (
    <>
      <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Image */}
          {paper.images?.[0] ? (
            <img
              src={paper.images[0]}
              alt={paper.name}
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '0.5px solid var(--color-border)' }}
            />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--color-background-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '0.5px solid var(--color-border)' }}>
              📄
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{paper.name}</p>
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 500,
                background: paper.category === 'premium' ? '#2C2C2A' : '#D3D1C7',
                color: paper.category === 'premium' ? '#F1EFE8' : '#444441',
              }}>
                {paper.category === 'premium' ? 'Premium' : 'Standard'}
              </span>
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 500, background: statusConfig.bg, color: statusConfig.color }}>
                {statusConfig.label}
              </span>
              {paper.datasheet_url && (
                <a href={paper.datasheet_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#0F6E56', textDecoration: 'none' }}>
                  PDF
                </a>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>
              {paper.weight_gsm ? paper.weight_gsm + ' gsm · ' : ''}
              {paper.paper_id}
              {paper.barcode ? ' · ' + paper.barcode : ''}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>
              Add-on: A4 +{paper.add_on_a4} · A3 +{paper.add_on_a3} · A2 +{paper.add_on_a2} MVR
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <p style={{ fontSize: 11, margin: 0, color: isOut ? '#A32D2D' : isLow ? '#633806' : 'var(--color-text-muted)', fontWeight: isLow || isOut ? 500 : 400 }}>
                A4: {paper.stock_qty_a4} ({effectiveA4}) · A3: {paper.stock_qty_a3} ({effectiveA3}) · A2: {paper.stock_qty_a2} ({effectiveA2})
              </p>
              <button
                onClick={() => setShowHistory(true)}
                style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                History
              </button>
              {paper.barcode && (
                <button
                  onClick={() => setShowBarcode(b => !b)}
                  style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  {showBarcode ? 'Hide barcode' : 'Show barcode'}
                </button>
              )}
            </div>
            {paper.stock_note && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>{paper.stock_note}</p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-sm"
              style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', border: 'none' }}
              onClick={() => setShowRestock(true)}
            >
              + Restock
            </button>
            <button
              className="btn btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => onEdit(paper)}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              style={{ fontSize: 11 }}
              onClick={() => onDelete(paper)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Barcode toggle */}
        {showBarcode && paper.barcode && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--color-border)' }}>
            <BarcodeImage value={paper.barcode} width={160} />
          </div>
        )}
      </div>

      {showRestock && (
        <RestockModal
          paper={paper}
          onClose={() => setShowRestock(false)}
          onRestocked={onRefresh}
        />
      )}
      {showHistory && (
        <StockHistoryModal
          paper={paper}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  )
}
