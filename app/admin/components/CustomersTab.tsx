'use client'
import { useEffect, useState } from 'react'
import { formatMVR } from '@/lib/pricing'
import toast from 'react-hot-toast'

export function CustomersTab() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchCustomers() {
      const res = await fetch('/api/admin/customers')
      const data = await res.json()
      setCustomers(data.customers || [])
      setLoading(false)
    }
    fetchCustomers()
  }, [])

  const filtered = customers.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const totalRevenue = customers.reduce((s: number, c: any) => s + (c.total_spent || 0), 0)
  const newsletterCount = customers.filter(c => c.newsletter_opt_in).length

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Newsletter', 'SMS', 'First Order', 'Last Order', 'Guest'],
      ...filtered.map(c => [
        c.name, c.email, c.phone || '',
        c.order_count, c.total_spent,
        c.newsletter_opt_in ? 'Yes' : 'No',
        c.sms_opt_in ? 'Yes' : 'No',
        c.first_order_at ? new Date(c.first_order_at).toLocaleDateString() : '',
        c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '',
        c.is_guest ? 'Guest' : 'Account',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fineprint_customers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Customer list exported!')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading customers...</div>

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['Total customers', customers.length],
          ['Total revenue', formatMVR(totalRevenue)],
          ['Newsletter opt-ins', newsletterCount],
          ['Guest checkouts', customers.filter(c => c.is_guest).length],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input className="form-input" style={{ flex: 1, maxWidth: 320 }}
          placeholder="Search by name, email or phone..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {search ? 'No customers found.' : 'No customers yet — orders will appear here.'}
          </p>
        ) : filtered.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</p>
                {c.is_guest && <span style={{ fontSize: 10, background: 'var(--color-background-secondary)', color: 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20, border: '0.5px solid var(--color-border)' }}>Guest</span>}
                {c.newsletter_opt_in && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 7px', borderRadius: 20 }}>Newsletter</span>}
                {c.sms_opt_in && <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '1px 7px', borderRadius: 20 }}>SMS</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.email} · {c.phone || 'No phone'}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                First order {c.first_order_at ? new Date(c.first_order_at).toLocaleDateString() : '—'} · Last order {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '—'}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(c.total_spent || 0)}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.order_count} {c.order_count === 1 ? 'order' : 'orders'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
