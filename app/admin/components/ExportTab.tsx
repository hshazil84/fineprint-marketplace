'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'

export function OffersTab() {
  const [artworks, setArtworks] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchOffers() }, [])

  async function fetchOffers() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name, display_name)')
      .not('offer_pct', 'is', null)
      .order('created_at', { ascending: false })
    setArtworks(data || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading offers...</div>

  return (
    <div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          ['Active offers',   artworks.length],
          ['Avg discount',    artworks.length > 0 ? Math.round(artworks.reduce((s, a) => s + (a.offer_pct || 0), 0) / artworks.length) + '%' : '—'],
          ['Expiring soon',   artworks.filter(a => {
            if (!a.offer_expires) return false
            const diff = new Date(a.offer_expires).getTime() - Date.now()
            return diff > 0 && diff < 1000 * 60 * 60 * 24 * 3 // within 3 days
          }).length],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Your commission is always based on the original price regardless of artist discounts.
          </p>
        </div>

        {artworks.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No active offers.</p>
        ) : artworks.map(a => {
          const isExpiringSoon = a.offer_expires && (() => {
            const diff = new Date(a.offer_expires).getTime() - Date.now()
            return diff > 0 && diff < 1000 * 60 * 60 * 24 * 3
          })()
          const isExpired = a.offer_expires && new Date(a.offer_expires).getTime() < Date.now()

          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
              {a.preview_url && (
                <img
                  src={a.preview_url}
                  alt={a.title}
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.offer_label}</p>
                  <span style={{ fontSize: 11, background: 'var(--color-red-light)', color: '#A32D2D', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>
                    {a.offer_pct}% off
                  </span>
                  {isExpired && (
                    <span style={{ fontSize: 10, background: '#f0f0ec', color: 'var(--color-text-muted)', padding: '1px 7px', borderRadius: 20 }}>
                      Expired
                    </span>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>
                      Expiring soon
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {a.title} · {a.profiles?.display_name || a.profiles?.full_name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {formatMVR(a.price)} original
                  {' · '}
                  {formatMVR(a.price * (1 - a.offer_pct / 100))} discounted
                  {a.offer_expires ? ' · Expires ' + new Date(a.offer_expires).toLocaleDateString() : ' · No expiry'}
                </p>
              </div>
              <span className="badge" style={{ background: isExpired ? '#f0f0ec' : 'var(--color-red-light)', color: isExpired ? 'var(--color-text-muted)' : '#A32D2D' }}>
                {isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
