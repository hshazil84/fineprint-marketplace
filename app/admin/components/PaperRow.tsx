'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Paper } from './PaperFormModal'

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
  const [qty, setQty]     = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleRestock() {
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }
    setSaving(true)
    try {
      const newQty = paper.stock_qty + qty

      // Derive new stock status
      let newStatus = paper.stock_status
      if (newQty > paper.stock_low_threshold) newStatus = 'in_stock'
      else if (newQty > 0) newStatus = 'low_stock'

      await supabase
        .from('papers')
        .update({
          stock_qty: newQty,
          stock_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paper.id)

      await supabase
        .from('paper_stock_movements')
        .insert({
          paper_id:  paper.paper_id,
          change_qty: qty,
          reason:    'restock',
          notes:     notes || null,
        })

      toast.success(`Restocked ${qty} sheets — new total: ${newQty}`)
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

        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Current stock: <strong>{paper.stock_qty} sheets</strong>
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>
            Effective after {paper.wastage_pct}% wastage: <strong>{Math.floor(paper.stock_qty * (1 - paper.wastage_pct / 100))} sheets</strong>
          </p>
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
            placeholder="e.g. Supplier delivery March 2026"
          />
        </div>

        {qty > 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#0F6E56' }}>
            New total after restock: <strong>{paper.stock_qty + qty} sheets</strong>
            {' '}(effective: {Math.floor((paper.stock_qty + qty) * (1 - paper.wastage_pct / 100))})
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
    order_approved:   'Order deduction',
    manual_adjustment: 'Manual adjustment',
    restock:          'Restock',
    wastage:          'Wastage write-off',
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
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{reasonLabel[m.reason] || m.reason}</p>
                  {m.notes && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{m.notes}</p>}
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: m.change_qty > 0 ? '#0F6E56' : '#A32D2D',
                  flexShrink: 0,
                }}>
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
  const [showRestock, setShowRestock]       = useState(false)
  const [showHistory, setShowHistory]       = useState(false)
  const [deleting, setDeleting]             = useState(false)

  const statusConfig = STOCK_STATUS_CONFIG[paper.stock_status] || STOCK_STATUS_CONFIG.in_stock
  const effectiveQty = Math.floor(paper.stock_qty * (1 - (paper.wastage_pct || 10) / 100))
  const isLow        = paper.stock_status === 'low_stock'
  const isOut        = paper.stock_status === 'out_of_stock'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)' }}>

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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              A4 +{paper.add_on_a4} · A3 +{paper.add_on_a3} · A2 +{paper.add_on_a2} MVR
            </p>
            <p style={{ fontSize: 11, margin: 0, color: isOut ? '#A32D2D' : isLow ? '#633806' : 'var(--color-text-muted)', fontWeight: isLow || isOut ? 500 : 400 }}>
              {paper.stock_qty} sheets · {effectiveQty} effective
            </p>
            <button
              onClick={() => setShowHistory(true)}
              style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              History
            </button>
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
            disabled={deleting}
          >
            Delete
          </button>
        </div>
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
