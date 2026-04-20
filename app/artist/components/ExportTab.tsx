'use client'
import { useState } from 'react'
import { formatMVR } from '@/lib/pricing'

export function ExportTab({ onExport, orders }: any) {
  const today = new Date().toISOString().split('T')[0]
  const yearStart = new Date().getFullYear() + '-01-01'
  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(today)

  const filtered = orders.filter((o: any) =>
    o.created_at >= from && o.created_at <= to + 'T23:59:59' && o.status === 'approved'
  )
  const gross = filtered.reduce((s: number, o: any) => s + o.original_price, 0)
  const earned = filtered.reduce((s: number, o: any) => s + o.artist_earnings, 0)

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Export my sales</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Download a CSV of your approved sales for any date range.
      </p>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          ['Orders', filtered.length],
          ['Gross', 'MVR ' + gross.toLocaleString()],
          ['Earnings', 'MVR ' + earned.toLocaleString()],
        ].map(([l, v]) => (
          <div key={l as string} className="stat-card">
            <p className="stat-label">{l}</p>
            <p className="stat-value" style={{ fontSize: 16 }}>{v}</p>
          </div>
        ))}
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
      <button className="btn btn-primary btn-full" onClick={() => onExport(from, to)}>
        Download CSV
      </button>
    </div>
  )
}
