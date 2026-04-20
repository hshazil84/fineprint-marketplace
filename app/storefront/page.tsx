'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import Link from 'next/link'
import Footer from '@/app/components/Footer'

interface Artwork {
  id: number
  sku: string
  title: string
  price: number
  preview_url: string
  sizes: string[]
  offer_label: string | null
  offer_pct: number | null
  category: string | null
  painting_by: string | null
  artist_id: string
  profiles: { full_name: string; artist_code: string; avatar_url: string | null }
}

interface Artist {
  id: string
  full_name: string
  artist_code: string
  avatar_url: string | null
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(code: string) {
  const colors = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#BA7517', '#993556', '#0F6E56']
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function StorefrontPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [topSelling, setTopSelling] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeArtist, setActiveArtist] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([fetchArtworks(), fetchArtists(), fetchTopSelling()])
  }, [])

  async function fetchArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('id, sku, title, price, preview_url, sizes, offer_label, offer_pct, category, painting_by, artist_id, profiles:artist_id(full_name, artist_code, avatar_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    setArtworks(data || [])
    setLoading(false)
  }

  async function fetchArtists() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, artist_code, avatar_url')
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
      .limit(10)
    setArtists(data || [])
  }

  async function fetchTopSelling() {
    const { data } = await supabase
      .from('orders')
      .select('artwork_id, artworks(id, title, price, preview_url, sku, offer_pct, profiles:artist_id(full_name))')
      .eq('status', 'approved')
    if (!data) return
    const counts: Record<string, { count: number; artwork: any }> = {}
    data.forEach((o: any) => {
      if (!o.artwork_id || !o.artworks) return
      if (!counts[o.artwork_id]) counts[o.artwork_id] = { count: 0, artwork: o.artworks }
      counts[o.artwork_id].count++
    })
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3)
    setTopSelling(sorted)
  }

  const filtered = artworks.filter(a => {
    const matchesSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.profiles?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.sku.toLowerCase().includes(search.toLowerCase())
    const matchesArtist = !activeArtist || a.profiles?.artist_code === activeArtist
    return matchesSearch && matchesArtist
  })

  return (
    <div>
      <nav className="nav">
        <Link href="/" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <Link href="/orders/track" style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none' }}>Track order</Link>
          <Link href="/auth/login" className="btn">Log in</Link>
          <Link href="/auth/signup" className="btn btn-primary">Sign up</Link>
        </div>
      </nav>

      {/* Search bar */}
      <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, opacity: 0.4 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search artworks, artists..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              background: 'var(--color-background-secondary)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--border-radius-lg)',
              fontSize: 13, color: 'var(--color-text)',
              outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)' }}>✕</button>
          )}
        </div>
      </div>

      {/* Artist belt */}
      {artists.length > 0 && (
        <div style={{ borderBottom: '0.5px solid var(--color-border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <style>{`.belt::-webkit-scrollbar{display:none}`}</style>
          <div className="belt" style={{ display: 'flex', padding: '12px 20px', gap: 18, alignItems: 'center', minWidth: 'max-content' }}>
            {/* All */}
            <button onClick={() => setActiveArtist(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: activeArtist === null ? '#1a1a1a' : 'var(--color-background-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 500,
                color: activeArtist === null ? '#fff' : 'var(--color-text-muted)',
                border: activeArtist === null ? '2px solid #1a1a1a' : '1.5px solid var(--color-border)',
                transition: 'all 0.15s',
              }}>ALL</div>
              <span style={{ fontSize: 10, color: activeArtist === null ? 'var(--color-text)' : 'var(--color-text-muted)' }}>All</span>
            </button>

            {artists.map(artist => {
              const isActive = activeArtist === artist.artist_code
              const color = getAvatarColor(artist.artist_code || 'FP')
              return (
                <button key={artist.id} onClick={() => setActiveArtist(isActive ? null : artist.artist_code)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
                    border: isActive ? `2px solid ${color}` : '1.5px solid var(--color-border)',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.full_name} width={38} height={38}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                        loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#fff' }}>
                        {getInitials(artist.full_name)}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, whiteSpace: 'nowrap', color: isActive ? color : 'var(--color-text-muted)', fontWeight: isActive ? 500 : 400, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {artist.full_name.split(' ')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* Top selling */}
        {topSelling.length > 0 && !search && !activeArtist && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400 }}>Top selling</h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Based on orders</span>
            </div>
            <div className="grid-3">
              {topSelling.map((item, i) => {
                const ranks = ['🥇', '🥈', '🥉']
                const artwork = item.artwork
                const discounted = artwork.offer_pct ? Math.round(artwork.price * (1 - artwork.offer_pct / 100)) : artwork.price
                return (
                  <Link key={artwork.id} href={`/artwork/${artwork.id}`} style={{ textDecoration: 'none' }}>
                    <div className="artwork-card" style={{ borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', border: '0.5px solid var(--color-border)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, fontSize: 18 }}>{ranks[i]}</div>
                      <div style={{ height: 180, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                        {artwork.preview_url && (
                          <img src={artwork.preview_url} alt={artwork.title} loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        )}
                      </div>
                      <div style={{ padding: '10px 14px 12px' }}>
                        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{artwork.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>by {artwork.profiles?.full_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(discounted)}</span>
                          <span style={{ fontSize: 10, color: 'var(--color-teal)' }}>{item.count} sold</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* All prints header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400 }}>
            {activeArtist ? `${artists.find(a => a.artist_code === activeArtist)?.full_name || 'Artist'}'s prints` : 'Browse Prints'}
          </h1>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'print' : 'prints'}
            {activeArtist && (
              <button onClick={() => setActiveArtist(null)} style={{ background: 'none', border: 'none', color: 'var(--color-teal)', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>Clear ✕</button>
            )}
          </span>
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            {search ? `No results for "${search}"` : 'No artworks available yet.'}
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(artwork => <ArtworkCard key={artwork.id} artwork={artwork} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', border: '0.5px solid var(--color-border)' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.shimmer{background:linear-gradient(90deg,var(--color-background-secondary) 25%,var(--color-border) 50%,var(--color-background-secondary) 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;}`}</style>
      <div className="shimmer" style={{ height: 220, borderRadius: 0 }} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div className="shimmer" style={{ height: 13, width: '70%', borderRadius: 4, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 11, width: '45%', borderRadius: 4, marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 13, width: '30%', borderRadius: 4 }} />
      </div>
    </div>
  )
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const discountedPrice = artwork.offer_pct
    ? Math.round(artwork.price * (1 - artwork.offer_pct / 100))
    : artwork.price

  return (
    <Link href={`/artwork/${artwork.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', border: '0.5px solid var(--color-border)', transition: 'border-color 0.15s', background: 'var(--color-surface)' }}>
        <div style={{ height: 220, background: 'var(--color-background-secondary)', position: 'relative', overflow: 'hidden' }}>
          {!imgLoaded && (
            <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />
          )}
          {artwork.preview_url && (
            <img
              src={artwork.preview_url}
              alt={artwork.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
          )}
          <div className="protect-overlay" />
          {artwork.offer_pct && (
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--color-red)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, zIndex: 20, pointerEvents: 'none' }}>
              {artwork.offer_pct}% off
            </div>
          )}
          {artwork.category && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.88)', color: '#333', fontSize: 10, padding: '2px 8px', borderRadius: 20, zIndex: 20, pointerEvents: 'none' }}>
              {artwork.category}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--color-text)' }}>{artwork.title}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            by {artwork.painting_by || artwork.profiles?.full_name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {artwork.offer_pct ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--color-text-hint)', textDecoration: 'line-through' }}>{formatMVR(artwork.price)}</span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(discountedPrice)}</span>
              </>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(artwork.price)}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="sku-tag">{artwork.sku}</span>
            {artwork.offer_label && <span className="offer-tag">{artwork.offer_label}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
