'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import Link from 'next/link'
import Header from '@/app/components/Header'
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
  created_at: string
  profiles: { full_name: string; artist_code: string; avatar_url: string | null }
}

interface Artist {
  id: string
  full_name: string
  artist_code: string
  avatar_url: string | null
}

const CATEGORIES = ['All', 'Photography', 'Fine Art', 'Abstract', 'Illustration', 'Digital Art', 'Watercolour', 'Charcoal & Sketch', 'Mixed Media']
const AVATAR_COLORS = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#BA7517', '#993556', '#0F6E56', '#534AB7', '#D4537E', '#639922']

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getColor(code: string) {
  let h = 0
  for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="#FAC775" style={{ flexShrink: 0 }}>
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6" />
    </svg>
  )
}

export default function StorefrontPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [topSellerIds, setTopSellerIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const supabase = createClient()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const [artRes, artistRes, orderRes] = await Promise.all([
      supabase
        .from('artworks')
        .select('id, sku, title, price, preview_url, sizes, offer_label, offer_pct, category, painting_by, artist_id, created_at, profiles:artist_id(full_name, artist_code, avatar_url)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, artist_code, avatar_url')
        .eq('role', 'artist')
        .limit(20),
      supabase
        .from('orders')
        .select('artwork_id')
        .eq('status', 'approved'),
    ])

    setArtworks((artRes.data || []) as any)
    setArtists(artistRes.data || [])

    if (orderRes.data) {
      const counts: Record<number, number> = {}
      orderRes.data.forEach((o: any) => {
        if (o.artwork_id) counts[o.artwork_id] = (counts[o.artwork_id] || 0) + 1
      })
      const top5 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => Number(id))
      setTopSellerIds(new Set(top5))
    }

    setLoading(false)
  }

  const recentSix = artworks.slice(0, 6)

  const filtered = artworks.filter(a => {
    const matchSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      a.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'All' || a.category === activeCategory
    return matchSearch && matchCat
  })

  const tickerArtists = [...artists, ...artists, ...artists]

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <style>{`
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-33.333%) } }
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        .ticker-track { animation: ticker 32s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        .mobile-swipe::-webkit-scrollbar { display: none; }
        @media(max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          .desktop-grid { display: none !important; }
          .mobile-grid { display: grid !important; }
        }
        @media(min-width: 769px) {
          .mobile-only { display: none !important; }
          .desktop-only { display: block !important; }
          .mobile-grid { display: none !important; }
        }
      `}</style>

      <Header
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={setSearch}
      />

      {/* CATEGORY CHIPS */}
      <div style={{ borderBottom: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-background-primary)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 6, height: 44, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              fontSize: 12, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              border: activeCategory === cat ? '0.5px solid #1a1a1a' : '0.5px solid var(--color-border)',
              backgroundColor: activeCategory === cat ? '#1a1a1a' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

{/* ARTIST TICKER */}
{artists.length > 0 && (
  <div style={{ borderBottom: '0.5px solid var(--color-border)', height: 68, overflow: 'hidden' }}>
    <div style={{
      maxWidth: 1080,
      margin: '0 auto',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
    }}>
      <div className="ticker-track" style={{ display: 'flex', gap: 14, width: 'max-content', padding: '0 40px' }}>
        {tickerArtists.map((artist, i) => {
          const color = getColor(artist.artist_code || 'FP')
          return (
            <div key={`${artist.id}-${i}`} style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              overflow: 'hidden', cursor: 'pointer',
              border: '2px solid var(--color-border)',
              transition: 'transform 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
              {artist.avatar_url ? (
                <img src={artist.avatar_url} alt={artist.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                  {getInitials(artist.full_name)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  </div>
)}

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 24px 80px' }}>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <>
            {/* RECENTLY LISTED */}
            {!search && activeCategory === 'All' && recentSix.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 500 }}>Recently listed</h2>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>6 newest artworks</span>
                </div>

               {/* Desktop: 3-col grid */}
                <div className="desktop-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, width: '100%' }}>

                {/* Mobile: 1 card golden view with horizontal swipe */}
                <div className="mobile-only" style={{ display: 'none' }}>
                  <div className="mobile-swipe" style={{
                    display: 'flex', gap: 12,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch' as any,
                    scrollbarWidth: 'none',
                  }}>
                    {recentSix.map(artwork => (
                      <div key={artwork.id} style={{ flex: '0 0 calc(100vw - 48px)', scrollSnapAlign: 'start' }}>
                        <ArtworkCard43 artwork={artwork} isNew={false} isTopSeller={topSellerIds.has(artwork.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DIVIDER */}
            {!search && activeCategory === 'All' && (
              <hr style={{ border: 'none', borderTop: '0.5px solid var(--color-border)', marginBottom: 28 }} />
            )}

            {/* ALL PRINTS HEADER */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 500 }}>
                {search ? `Results for "${search}"` : activeCategory !== 'All' ? activeCategory : 'All prints'}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>
                  · {filtered.length} {filtered.length === 1 ? 'print' : 'prints'}
                </span>
              </h2>
              {(search || activeCategory !== 'All') && (
                <button onClick={() => { setSearch(''); setActiveCategory('All') }}
                  style={{ fontSize: 12, color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear ✕
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                No artworks found.
              </div>
            ) : (
              <>
                {/* Desktop: 5-col 1:1 */}
                <div className="desktop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
                  {filtered.map(artwork => (
                    <ArtworkCard11 key={artwork.id} artwork={artwork} isTopSeller={topSellerIds.has(artwork.id)} />
                  ))}
                </div>
                {/* Mobile: 2-col grid */}
                <div className="mobile-grid" style={{ display: 'none', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                  {filtered.map(artwork => (
                    <ArtworkCard11 key={artwork.id} artwork={artwork} isTopSeller={topSellerIds.has(artwork.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

function ArtworkCard43({ artwork, isNew, isTopSeller }: { artwork: Artwork; isNew: boolean; isTopSeller: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const discounted = artwork.offer_pct ? Math.round(artwork.price * (1 - artwork.offer_pct / 100)) : artwork.price

  return (
    <Link href={`/artwork/${artwork.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-background-primary)', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
        <div style={{ aspectRatio: '4/3', position: 'relative', backgroundColor: 'var(--color-background-secondary)', overflow: 'hidden' }}>
          {!loaded && <SkeletonShimmer style={{ position: 'absolute', inset: 0 }} />}
          {artwork.preview_url && (
            <img src={artwork.preview_url} alt={artwork.title} loading="lazy" decoding="async"
              onLoad={() => setLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} />
          )}
          <div className="protect-overlay" />
          {artwork.offer_pct && (
            <div style={{ position: 'absolute', top: 8, left: 8, background: '#E24B4A', color: '#FCEBEB', fontSize: 10, padding: '2px 8px', borderRadius: 20, pointerEvents: 'none' }}>
              {artwork.offer_pct}% off
            </div>
          )}
          {isTopSeller && (
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 3, background: '#1a1a1a', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, pointerEvents: 'none' }}>
              <StarIcon />Top seller
            </div>
          )}
          {isNew && !isTopSeller && (
            <div style={{ position: 'absolute', top: 8, right: 8, background: '#1D9E75', color: '#E1F5EE', fontSize: 10, padding: '2px 8px', borderRadius: 20, pointerEvents: 'none' }}>New</div>
          )}
          {artwork.category && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(255,255,255,0.88)', color: '#2C2C2A', fontSize: 10, padding: '2px 8px', borderRadius: 20, pointerEvents: 'none' }}>
              {artwork.category}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artwork.title}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>by {artwork.painting_by || artwork.profiles?.full_name}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {artwork.offer_pct ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--color-text-hint)', textDecoration: 'line-through' }}>{formatMVR(artwork.price)}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(discounted)}</span>
                </>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(artwork.price)}</span>
              )}
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{artwork.sku}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ArtworkCard11({ artwork, isTopSeller }: { artwork: Artwork; isTopSeller: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const discounted = artwork.offer_pct ? Math.round(artwork.price * (1 - artwork.offer_pct / 100)) : artwork.price

  return (
    <Link href={`/artwork/${artwork.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-background-primary)', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
        <div style={{ aspectRatio: '1', position: 'relative', backgroundColor: 'var(--color-background-secondary)', overflow: 'hidden' }}>
          {!loaded && <SkeletonShimmer style={{ position: 'absolute', inset: 0 }} />}
          {artwork.preview_url && (
            <img src={artwork.preview_url} alt={artwork.title} loading="lazy" decoding="async"
              onLoad={() => setLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} />
          )}
          <div className="protect-overlay" />
          {artwork.offer_pct && (
            <div style={{ position: 'absolute', top: 6, left: 6, background: '#E24B4A', color: '#FCEBEB', fontSize: 9, padding: '2px 6px', borderRadius: 20, pointerEvents: 'none' }}>
              −{artwork.offer_pct}%
            </div>
          )}
          {isTopSeller && (
            <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 2, background: '#1a1a1a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 20, pointerEvents: 'none' }}>
              <StarIcon />Top
            </div>
          )}
        </div>
        <div style={{ padding: '9px 10px 10px' }}>
          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 1, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artwork.title}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artwork.painting_by || artwork.profiles?.full_name}</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{formatMVR(discounted)}</p>
        </div>
      </div>
    </Link>
  )
}

function SkeletonShimmer({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, var(--color-background-secondary) 25%, var(--color-border) 50%, var(--color-background-secondary) 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

function SkeletonGrid() {
  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <div style={{ height: 20, width: 140, background: 'var(--color-background-secondary)', borderRadius: 4, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)' }}>
              <SkeletonShimmer style={{ aspectRatio: '4/3', display: 'block' }} />
              <div style={{ padding: '12px 14px 14px' }}>
                <SkeletonShimmer style={{ height: 13, width: '70%', borderRadius: 3, marginBottom: 8 }} />
                <SkeletonShimmer style={{ height: 11, width: '45%', borderRadius: 3, marginBottom: 10 }} />
                <SkeletonShimmer style={{ height: 13, width: '30%', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '0.5px solid var(--color-border)', marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)' }}>
            <SkeletonShimmer style={{ aspectRatio: '1', display: 'block' }} />
            <div style={{ padding: '9px 10px 10px' }}>
              <SkeletonShimmer style={{ height: 11, width: '70%', borderRadius: 3, marginBottom: 6 }} />
              <SkeletonShimmer style={{ height: 10, width: '45%', borderRadius: 3, marginBottom: 6 }} />
              <SkeletonShimmer style={{ height: 11, width: '30%', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
