'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, getFromPrice } from '@/lib/pricing'
import { useWishlist } from '@/lib/wishlist'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export default function WishlistPage() {
  const router = useRouter()
  const { items, toggle } = useWishlist()
  const [artworks, setArtworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (items.length === 0) { setArtworks([]); setLoading(false); return }
    supabase
      .from('artworks')
      .select('id, title, price, preview_url, sizes, offer_pct, offer_label, painting_by, profiles:artist_id(full_name, display_name)')
      .in('id', items)
      .eq('status', 'approved')
      .then(({ data }) => {
        const ordered = items.map(id => data?.find((a: any) => a.id === id)).filter(Boolean)
        setArtworks(ordered as any[])
        setLoading(false)
      })
  }, [items])

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Wishlist</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28 }}>
          {items.length === 0 ? 'Nothing saved yet.' : `${items.length} saved artwork${items.length !== 1 ? 's' : ''}`}
        </p>

        {loading && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</p>}

        {!loading && artworks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🤍</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Tap the heart on any artwork to save it here.
            </p>
            <button
              onClick={() => router.push('/storefront')}
              style={{ fontSize: 13, padding: '9px 20px', borderRadius: 20, border: '0.5px solid #1a1a1a', background: '#1a1a1a', color: '#fff', cursor: 'pointer' }}
            >
              Browse artworks
            </button>
          </div>
        )}

        {artworks.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {artworks.map((a: any) => {
              const fromPrice = getFromPrice(a.price, a.sizes || ['A4'], a.offer_pct || 0)
              const name = a.profiles?.display_name || a.profiles?.full_name || ''
              return (
                <div key={a.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => router.push(`/artwork/${a.id}`)}
                    style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', cursor: 'pointer', backgroundColor: 'var(--color-background-primary)' }}
                  >
                    <div style={{ aspectRatio: '1', position: 'relative', backgroundColor: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                      {a.preview_url && (
                        <img src={a.preview_url} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                      )}
                      {a.offer_pct && (
                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#E24B4A', color: '#FCEBEB', fontSize: 9, padding: '2px 6px', borderRadius: 20 }}>
                          -{a.offer_pct}%
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 10px 10px' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)' }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.painting_by || name}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>From </span>
                        {formatMVR(fromPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Remove from wishlist */}
                  <button
                    onClick={() => toggle(a.id)}
                    title="Remove from wishlist"
                    style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', color: '#E05252' }}
                  >
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
