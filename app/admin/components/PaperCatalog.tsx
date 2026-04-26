'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Paper, PaperFormModal } from './PaperFormModal'
import { PaperRow } from './PaperRow'

const STOCK_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: 'In stock',     color: '#0F6E56', bg: '#E1F5EE' },
  low_stock:    { label: 'Low stock',    color: '#633806', bg: '#FAEEDA' },
  backorder:    { label: 'Backorder',    color: '#185FA5', bg: '#E6F1FB' },
  out_of_stock: { label: 'Out of stock', color: '#A32D2D', bg: '#FCEBEB' },
}

export function PaperCatalog() {
  const [papers, setPapers]             = useState<Paper[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const supabase = createClient()

  useEffect(() => { fetchPapers() }, [])

  async function fetchPapers() {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('sort_order', { ascending: true })
    setPapers(data || [])
    setLoading(false)
  }

  async function deletePaper(paper: Paper) {
    if (!confirm(`Delete "${paper.name}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('papers').delete().eq('id', paper.id)
      if (error) throw error
      toast.success('Paper deleted')
      fetchPapers()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = papers.filter(p => {
    const matchCat    = filterCategory === 'all' || p.category === filterCategory
    const matchStatus = filterStatus === 'all' || p.stock_status === filterStatus
    return matchCat && matchStatus
  })

  const totalPapers  = papers.length
  const standardCount = papers.filter(p => p.category === 'standard').length
  const premiumCount  = papers.filter(p => p.category === 'premium').length
  const lowStock      = papers.filter(p => p.stock_status === 'low_stock').length
  const outOfStock    = papers.filter(p => p.stock_status === 'out_of_stock').length
  const backorder     = papers.filter(p => p.stock_status === 'backorder').length

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Loading papers...
    </div>
  )

  return (
    <div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Total',      totalPapers],
          ['Standard',   standardCount],
          ['Premium',    premiumCount],
          ['Low / Out',  lowStock + outOfStock],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {lowStock > 0 && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#633806' }}>
          {lowStock} paper{lowStock > 1 ? 's are' : ' is'} running low on stock.
        </div>
      )}
      {outOfStock > 0 && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#A32D2D' }}>
          {outOfStock} paper{outOfStock > 1 ? 's are' : ' is'} out of stock.
        </div>
      )}
      {backorder > 0 && (
        <div style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#185FA5' }}>
          {backorder} paper{backorder > 1 ? 's are' : ' is'} on backorder.
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-input"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ fontSize: 13, maxWidth: 150 }}
        >
          <option value="all">All tiers</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
        <select
          className="form-input"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize: 13, maxWidth: 160 }}
        >
          <option value="all">All statuses</option>
          {Object.entries(STOCK_STATUS_CONFIG).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </select>
        {(filterCategory !== 'all' || filterStatus !== 'all') && (
          <button className="btn btn-sm" onClick={() => { setFilterCategory('all'); setFilterStatus('all') }}>Clear ×</button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 13 }}
            onClick={() => { setEditingPaper(null); setShowForm(true) }}
          >
            + Add paper
          </button>
        </div>
      </div>

      {/* Papers list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {papers.length === 0 ? 'No papers yet. Add your first paper.' : 'No papers match your filters.'}
          </p>
        ) : filtered.map(p => (
          <PaperRow
            key={p.id}
            paper={p}
            onEdit={paper => { setEditingPaper(paper); setShowForm(true) }}
            onDelete={deletePaper}
            onRefresh={fetchPapers}
          />
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <PaperFormModal
          paper={editingPaper}
          onClose={() => { setShowForm(false); setEditingPaper(null) }}
          onSaved={fetchPapers}
        />
      )}
    </div>
  )
}
