'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { downloadCSVFile, dateRangeFilename } from '@/lib/csvExport'
import toast from 'react-hot-toast'

export function ExportTab() {
  const [artists, setArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today     = new Date().toISOString().split('T')[0]
  const yearStart = new Date().getFullYear() + '-01-01'
  const [from, setFrom]     = useState(yearStart)
  const [to, setTo]         = useState(today)
  const [artist, setArtist] = useState('all')
  const [preview, setPreview] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchArtists() }, [])
  useEffect(() => { fetchPreview() }, [from, to, artist])

  async function fetchArtists() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, artist_code')
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
    setArtists(data || [])
    setLoading(false)
  }

  async function fetchPreview() {
    setPreviewLoading(true)
    let query = supabase
      .from('orders')
      .select('*, artworks(title, sku, profiles:artist_id(full_name, display_name, artist_code))')
      .eq('status', 'approved')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (artist !== 'all') {
      query = query.eq('artworks.profiles.artist_code', artist)
    }

    const { data } = await query
    setPreview((data || []).filter((o: any) => {
      if (artist === 'all') return true
      return o.artworks?.profiles?.artist_code === artist
    }))
    setPreviewLoading(false)
  }

  function applyMonth(val: string) {
    if (!val) return
    const parts = val.split('-')
    const y = parts[0], m = parts[1]
    const last = new Date(parseInt(y), parseInt(m), 0).getDate()
    setFrom(val + '-01')
    setTo(val + '-' + String(last).padStart(2, '0'))
  }

  async function handleExport() {
    const res  = await fetch('/api/export?type=admin&from=' + from + '&to=' + to + '&artist=' + artist)
    const text = await res.text()
    downloadCSVFile(text, dateRangeFilename(from, to, 'fineprint_sales_' + artist))
    toast.success('CSV downloaded!')
  }

  const months: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      value: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    })
  }

  const gross = preview.reduce((s, o) => s + (o.original_price || 0), 0)
  const comm  = preview.reduce((s, o) => s + (o.fp_commission || 0), 0)
  const earnings = preview.reduce((s, o) => s + (o.artist_earnings || 0), 0)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 640 }}>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Export sales report</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Filter by artist and date range, then download the full CSV.
        </p>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Artist</label>
            <select className="form-input" value={artist} onChange={e => setArtist(e.target.value)}>
              <option value="all">All artists</option>
              {artists.map((a: any) => (
                <option key={a.id} value={a.artist_code}>
                  FP-{a.artist_code} — {a.display_name || a.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quick select month</label>
            <select className="form-input" onChange={e => applyMonth(e.target.value)} defaultValue="">
              <option value="">— pick a month —</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleExport}>
          Download CSV
        </button>
      </div>

      {/* Preview stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          ['Orders',     preview.length],
          ['Gross',      formatMVR(gross)],
          ['Commission', formatMVR(comm)],
        ].map(([l, v]) => (
          <div key={l as string} className="stat-card">
            <p className="stat-label">{l}</p>
            <p className="stat-value" style={{ fontSize: 16 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Preview table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>
            Preview — {previewLoading ? 'loading...' : preview.length + ' orders'}
          </p>
        </div>
        {preview.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No approved orders in this range.
          </p>
        ) : preview.slice(0, 10).map((o: any) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{o.invoice_number}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {o.artworks?.title} · {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(o.total_paid)}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {formatMVR(o.fp_commission)} comm
              </p>
            </div>
          </div>
        ))}
        {preview.length > 10 && (
          <div style={{ padding: '12px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              + {preview.length - 10} more orders in the CSV export
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
