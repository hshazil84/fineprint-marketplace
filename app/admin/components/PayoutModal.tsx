'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import toast from 'react-hot-toast'

export function PayoutModal({ payout, onClose, onPaid }: {
  payout: any
  onClose: () => void
  onPaid: () => void
}) {
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  function handleSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setSlipPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function markAsPaid() {
    if (!slipFile) { toast.error('Please upload payment slip first'); return }
    setSubmitting(true)
    try {
      const slipPath = `payout-${payout.id}.${slipFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('order-slips').upload(slipPath, slipFile, { contentType: slipFile.type })
      if (uploadError) throw uploadError
      const paidAt = new Date().toISOString()
      const { error } = await supabase.from('payouts').update({ status: 'paid', slip_url: slipPath, paid_at: paidAt }).eq('id', payout.id)
      if (error) throw error
      await supabase.from('orders').update({ payout_status: 'paid' })
        .eq('artist_id', payout.artist_id).eq('payout_status', 'unpaid').eq('status', 'approved')
      await fetch('/api/notify/payout-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistName: payout.profiles?.full_name,
          artistEmail: payout.profiles?.email,
          amount: payout.amount,
          bankName: payout.bank_name,
          accountNumber: payout.account_number,
          paidAt: new Date(paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      })
      toast.success('Payout marked as paid — artist notified!')
      onPaid()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Payout — {payout.profiles?.display_name || payout.profiles?.full_name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{formatMVR(payout.amount)} · Requested {new Date(payout.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 10 }}>Bank transfer details</p>
            {[['Bank', payout.bank_name], ['Account name', payout.account_name], ['Account number', payout.account_number], ['Amount', formatMVR(payout.amount)]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: k === 'Amount' ? 500 : 400, fontFamily: k === 'Account number' ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                  {k === 'Account number' && (
                    <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => { navigator.clipboard.writeText(v as string); toast.success('Copied!') }}>Copy</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Upload payment confirmation slip</p>
          <div className="upload-zone" onClick={() => document.getElementById('payout-slip-input')?.click()} style={{ marginBottom: 12 }}>
            {slipPreview ? (
              <img src={slipPreview} alt="slip" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <>
                <p style={{ fontSize: 20, marginBottom: 6 }}>📎</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{slipFile ? slipFile.name : 'Tap to upload payment slip'}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG, PNG or PDF</p>
              </>
            )}
          </div>
          <input type="file" id="payout-slip-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleSlip} />
          <button className="btn btn-success btn-full" onClick={markAsPaid} disabled={submitting || !slipFile}>
            {submitting ? 'Processing...' : `✓ Mark as paid — ${formatMVR(payout.amount)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
