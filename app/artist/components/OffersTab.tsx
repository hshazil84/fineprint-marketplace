'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import toast from 'react-hot-toast'

const PLATFORM_FEE = 5

export function OffersTab({ artworks, onRefresh }: any) {
  const [label, setLabel] = useState('Eid Special')
  const [pct, setPct] = useState(15)
  const [target, setTarget] = useState('all')
  const supabase = createClient()

  const previewPrice = artworks[0]?.price || 800
  const discount = Math.round(previewPrice * pct / 100)
  const discountedPrice = previewPrice - discount
  const platformFee = Math.round(discountedPrice * PLATFORM_FEE / 100)
  const artistEarns = discountedPrice - platformFee

  async function activate() {
    const updates = target === 'all' ? artworks.map((a: any) => a.id) : [parseInt(target)]
    for (const id of updates) {
      await supabase.from('artworks').update({ offer_label: label, offer_pct: pct }).eq('id', id)
    }
    toast.success('Offer activated!')
    onRefresh()
  }

  async function removeOffer(id: number) {
    await supabase.from('artworks').update({ offer_label: null, offer_pct: null }).eq('id', id)
    toast.success('Offer removed')
    onRefresh()
  }

  const activeOffers = artworks.filter((a: any) => a.offer_pct)

  return (
    <div>
      <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Create an offer</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Discounts come entirely out of your share. Platform fee (5%) is applied after discount.
        </p>
        <div className="form-group">
          <label className="form-label">Apply to</label>
          <select className="form-input" value={target} onChange={e => setTarget(e.target.value)}>
            <option value="all">All my artworks</option>
            {artworks.map((a: any) => (
              <option key={a.id} value={a.id}>{a.sku} — {a.title}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Offer label</label>
          <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Eid Special" />
        </div>
        <div className="form-group">
          <label className="form-label">Discount: {pct}%</label>
          <input type="range" min={5} max={50} step={5} value={pct} onChange={e => setPct(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--border-radius-md)', padding: 14, marginTop: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Payout preview — artwork price at {formatMVR(previewPrice)}
          </p>
          {[
            ['Your artwork price', formatMVR(previewPrice), ''],
            ['Discount (' + pct + '%)', '- ' + formatMVR(discount), 'var(--color-red)'],
            ['Discounted price', formatMVR(discountedPrice), ''],
            ['Platform fee (5%)', '- ' + formatMVR(platformFee), 'var(--color-text-muted)'],
            ['Your earnings', formatMVR(artistEarns), 'var(--color-teal)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: (c as string) || 'var(--color-text)' }}>
              <span>{k}</span>
              <span style={{ fontWeight: k === 'Your earnings' ? 500 : 400 }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={activate}>
          Activate offer
        </button>
      </div>

      {activeOffers.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Active offers</p>
          {activeOffers.map((a: any) => {
            const discounted = a.price - Math.round(a.price * a.offer_pct / 100)
            const earn = discounted - Math.round(discounted * PLATFORM_FEE / 100)
            return (
              <div key={a.id} style={{ border: '0.5px solid var(--color-red)', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-lg)', padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label} — {a.offer_pct}% off</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {a.sku} · You earn {formatMVR(earn)} after platform fee
                  </p>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => removeOffer(a.id)}>Remove</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
