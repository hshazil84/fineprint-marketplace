'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import toast from 'react-hot-toast'

export function PayoutsTab({ profile, pendingEarnings, payouts, onRefresh, onViewRemittance }: any) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bankName: '', accountName: '', accountNumber: '' })
  const [submitting, setSubmitting] = useState(false)
  const [celebrated, setCelebrated] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fp_celebrated_payouts') || '[]')
    setCelebrated(stored)
    const newlyPaid = payouts.filter((p: any) => p.status === 'paid' && !stored.includes(p.id))
    if (newlyPaid.length > 0) {
      setTimeout(() => {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#5DCAA5', '#9FE1CB', '#1a1a1a', '#f3d6f5'] })
        })
      }, 400)
      const updated = [...stored, ...newlyPaid.map((p: any) => p.id)]
      localStorage.setItem('fp_celebrated_payouts', JSON.stringify(updated))
      setCelebrated(updated)
    }
  }, [payouts])

  async function submitRequest() {
    if (!form.bankName || !form.accountName || !form.accountNumber) { toast.error('Please fill in all bank details'); return }
    if (pendingEarnings <= 0) { toast.error('No pending earnings to request'); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payouts').insert({
        artist_id: user!.id,
        amount: pendingEarnings,
        bank_name: form.bankName,
        account_name: form.accountName,
        account_number: form.accountNumber,
        status: 'pending',
      })
      if (error) throw error
      await fetch('/api/notify/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: profile.full_name, amount: pendingEarnings, bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber }),
      })
      toast.success('Payout request submitted!')
      setShowForm(false)
      setForm({ bankName: '', accountName: '', accountNumber: '' })
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const paidPayouts = payouts.filter((p: any) => p.status === 'paid')
  const pendingPayouts = payouts.filter((p: any) => p.status === 'pending')

  return (
    <div>
      <style>{`
        @keyframes badgePop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Pending payout</p>
            <p style={{ fontSize: 28, fontWeight: 500, marginTop: 4, fontFamily: 'var(--font-display)' }}>{formatMVR(pendingEarnings)}</p>
          </div>
          {pendingEarnings > 0 && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Request payout'}
            </button>
          )}
        </div>
        {pendingEarnings <= 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No pending earnings to request.</p>
        )}
        {showForm && (
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--color-border)', paddingTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>
              Enter your bank details for this payout of <strong>{formatMVR(pendingEarnings)}</strong>.
            </p>
            <div className="form-group">
              <label className="form-label">Bank name</label>
              <input className="form-input" placeholder="e.g. Bank of Maldives" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Account holder name</label>
              <input className="form-input" placeholder="Full name as on account" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Account number</label>
              <input className="form-input" placeholder="Your account number" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-full" onClick={submitRequest} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Request payout of ' + formatMVR(pendingEarnings)}
            </button>
          </div>
        )}
      </div>

      {pendingPayouts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Pending requests</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {pendingPayouts.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Requested {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className="badge" style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-muted)' }}>pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidPayouts.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payout history</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {paidPayouts.map((p: any) => {
              const isNew = !celebrated.includes(p.id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12, background: isNew ? 'rgba(95,202,165,0.06)' : 'transparent', transition: 'background 1s ease' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Requested {new Date(p.created_at).toLocaleDateString()}
                      {p.paid_at ? ' · Paid ' + new Date(p.paid_at).toLocaleDateString() : ''}
                    </p>
                    <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => onViewRemittance(p)}>
                      View remittance
                    </button>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20, animation: isNew ? 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none' }}>
                    paid
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
