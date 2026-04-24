'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR, getFromPrice } from '@/lib/pricing'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { AvatarDisplay } from '@/app/artist/components/ProfileTab'

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
  profiles: { full_name: string; artist_code: string; avatar_url: string | null; display_name: string | null; shop_status: string | null }
}

interface Artist {
  id: string
  full_name: string
  display_name: string | null
  artist_code: string
  avatar_url: string | null
  avatar_config?: any
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular'

const SORT_LABELS: Record<SortOption, string> = {
  newest:     'Newest',
  price_asc:  'Price: Low → High',
  price_desc: 'Price: High → Low',
  popular:    'Most popular',
}

const PAGE_SIZE  = 20
const CATEGORIES = ['All', 'Photography', 'Fine Art', 'Abstract', 'Illustration', 'Digital Art', 'Watercolour', 'Charcoal & Sketch', 'Mixed Media']

function artistName(profiles: Artwork['profiles']): string {
  return profiles?.display_name || profiles?.full_name || 'Unknown'
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="#FAC775" style={{ flexShrink: 0 }}>
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6" />
    </svg>
  )
}

export default function StorefrontPage() {
  const [artworks, setArtworks]         = useState<Artwork[]>([])
  const [artists, setArtists]           = useState<Artist[]>([])
  const [orderCounts, setOrderCounts]   = useState<Record<number, number>>({})
  const [topSellerIds, setTopSellerIds] = useState<Set<number>>(new Set())
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sort, setSort]                 = useState<SortOption>('newest')
  const [page, setPage]                 = useState(1)
  const supabase = createClient()

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { setPage(1) }, [search, activeCategory, sort])

  async function fetchAll() {
    const [artRes, artistRes, orderRes] = await Promise.all([
      supabase
        .from('artworks')
        .select('id, sku, title, price, preview_url, sizes, offer_label, offer_pct, category, painting_by, artist_id, created_at, edition_size, editions_sold, profiles:artist_id(full_name, artist_code, avatar_url, display_name, shop_status)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, display_name, artist_code, avatar_url, avatar_config')
        .eq('role', 'artist')
        .eq('shop_status', 'open')
        .limit(20),
      supabase
        .from('orders')
        .select('artwork_id')
        .eq('status', 'approved'),
    ])

    const allArtworks      = (artRes.data || []) as any
    const filteredArtworks = allArtworks.filter((a: any) => a.profiles?.shop_status !== 'closed')
    setArtworks(filteredArtworks)
    setArtists(artistRes.data || [])

    if (orderRes.data) {
      const counts: Record<number, number> = {}
      orderRes.data.forEach((o: any) => {
        if (o.artwork_id) counts[o.artwork_id] = (counts[o.artwork_id] || 0) + 1
      })
      setOrderCounts(counts)
      const top5 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => Number(id))
      setTopSellerIds(new Set(top5))
    }

    setLoading(false)
  }

  const recentSix = artworks.slice(0, 6)

  const filtered = useMemo(() => {
    return artworks.filter(a => {
      const matchSearch = !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        artistName(a.profiles).toLowerCase().includes(search.toLowerCase()) ||
        a.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat = activeCategory === 'All' || a.category === activeCategory
      return matchSearch && matchCat
    })
  }, [artworks, search, activeCategory])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'price_asc':
        return arr.sort((a, b) => {
          const pa = getFromPrice(a.price, a.sizes || ['A4'], a.offer_pct || 0)
          const pb = getFromPrice(b.price, b.sizes || ['A4'], b.offer_pct || 0)
          return pa - pb
        })
      case 'price_desc':
        return arr.sort((a, b) => {
          const pa = getFromPrice(a.price, a.sizes || ['A4'], a.offer_pct || 0)
          const pb = getFromPrice(b.price, b.sizes || ['A4'], b.offer_pct || 0)
          return pb - pa
        })
      case 'popular':
        return arr.sort((a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0))
      case 'newest':
      default:
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [filtered, sort, orderCounts])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handlePage(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        .artist-belt::-webkit-scrollbar { display: none; }
        .cats-bar::-webkit-scrollbar { display: none; }
        .mobile-swipe::-webkit-scrollbar { display: none; }
        @media(max-width: 768px) {
          .fp-desktop-only { display: none !important; }
          .fp-mobile-only { display: block !important; }
          .fp-desktop-grid { display: none !important; }
          .fp-mobile-grid { display: grid !important; }
        }
        @media(min-width: 769px) {
          .fp-mobile-only { display: none !important; }
          .fp-desktop-only { display: grid !important; }
          .fp-desktop-grid { display: grid !important; }
          .fp-mobile-grid { display: none !important; }
        }
      `}</style>

      <Header search={search} onSearchChange={setSearch} onSearchSubmit={setSearch} />

      {/* CATEGORY CHIPS */}
      <div style={{ borderBottom: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
        <div className="cats-bar" style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 6, height: 44, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
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

      {/* ARTIST BELT */}
      {artists.length > 0 && (
        <div style={{ borderBottom: '0.5px solid var(--color-border)' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 56, background: 'linear-gradient(to right, var(--color-bg), transparent)', pointerEvents: 'none', zIndex: 2 }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, background: 'linear-gradient(to left, var(--color-bg), transparent)', pointerEvents: 'none', zIndex: 2 }} />
            <div className="artist-belt" style={{ display: 'flex', gap: 12, padding: '12px 40px', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}>
              {artists.map(artist => {
                const name = artist.display_name || artist.full_name
                return (
                  <Link
                    key={artist.id}
                    href={'/artist/' + artist.artist_code}
                    title={name}
                    style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      overflow: 'hidden', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--color-border)',
                      transition: 'transform 0.18s ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  >
                    <AvatarDisplay profile={artist} size={48} />
                  </Link>
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
            {!search && activeCategory === 'All' && sort === 'newest' && recentSix.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 500 }}>Recently listed</h2>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>6 newest artworks</span>
                </div>
                <div className="fp-desktop-only" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
                  {recentSix.map((artwork, i) => (
                    <ArtworkCard43 key={artwork.id} artwork={artwork} isNew={i < 2} isTopSeller={topSellerIds.has(artwork.id)} />
                  ))}
                </div>
                <div className="fp-mobile-only" style={{ display: 'none' }}>
                  <div className="mobile-swipe" style={{
                    display: 'flex', gap: 12,
                    overflowX: 'auto', scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none',
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

            {!search && activeCategory === 'All' && sort === 'newest' && (
              <hr style={{ border: 'none', borderTop: '0.5px solid var(--color-border)', marginBottom: 28 }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 15, fontWeight: 500 }}>
                {search ? `Results for "${search}"` : activeCategory !== 'All' ? activeCategory : 'All prints'}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>
                  · {sorted.length} {sorted.length === 1 ? 'print' : 'prints'}
                </span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(search || activeCategory !== 'All') && (
                  <button
                    onClick={() => { setSearch(''); setActiveCategory('All') }}
                    style={{ fontSize: 12, color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Clear ×
                  </button>
                )}
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                  style={{
                    fontSize: 12, padding: '5px 10px', borderRadius: 20,
                    border: '0.5px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text)',
                    cursor: 'pointer', outline: 'none',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {Object.entries(SORT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                No artworks found.
              </div>
            ) : (
              <>
                <div className="fp-desktop-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
                  {paginated.map(artwork => (
                    <ArtworkCard11 key={artwork.id} artwork={artwork} isTopSeller={topSellerIds.has(artwork.id)} />
                  ))}
                </div>
                <div className="fp-mobile-grid" style={{ display: 'none', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                  {paginated.map(artwork => (
                    <ArtworkCard11 key={artwork.id} artwork={artwork} isTopSeller={topSellerIds.has(artwork.id)} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
                )}
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  function getPages() {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const btnBase: React.CSSProperties = {
    minWidth: 36, height: 36, borderRadius: 8, border: '0.5px solid var(--color-border)',
    background: 'transparent', cursor: 'pointer', fontSize: 13,
    color: 'var(--color-text)', fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 40 }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={{ ...btnBase, opacity: page === 1 ? 0.35 : 1, padding: '0 12px' }}>←</button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ minWidth: 36, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            style={{
              ...btnBase,
              background:   page === p ? '#1a1a1a' : 'transparent',
              color:        page === p ? '#fff' : 'var(--color-text)',
              borderColor:  page === p ? '#1a1a1a' : 'var(--color-border)',
              fontWeight:   page === p ? 500 : 400,
            }}
          >
            {p}
          </button>
        )
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={{ ...btnBase, opacity: page === totalPages ? 0.35 : 1, padding: '0 12px' }}>→</button>
    </div>
  )
}

function ArtworkCard43({ artwork, isNew, isTopSeller }: { artwork: Artwork; isNew: boolean; isTopSeller: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const fromPrice = getFromPrice(artwork.price, artwork.sizes || ['A4'], artwork.offer_pct || 0)
  const name = artwork.profiles?.display_name || artwork.profiles?.full_name || ''

  return (
    <Link href={'/artwork/' + artwork.id} style={{ textDecoration: 'none' }}>
      <div
        style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-md)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div style={{ aspectRatio: '4/3', position: 'relative', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
          {!loaded && <SkeletonShimmer style={{ position: 'absolute', inset: 0 }} />}
          {artwork.preview_url && (
            <img src={artwork.preview_url} alt={artwork.title} loading="lazy" decoding="async"
              onLoad={() => setLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} />
          )}
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
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>by {artwork.painting_by || name}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>From</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{formatMVR(fromPrice)}</span>
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
  const fromPrice = getFromPrice(artwork.price, artwork.sizes || ['A4'], artwork.offer_pct || 0)
  const name = artwork.profiles?.display_name || artwork.profiles?.full_name || ''

  return (
    <Link href={'/artwork/' + artwork.id} style={{ textDecoration: 'none' }}>
      <div
        style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-md)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div style={{ aspectRatio: '1', position: 'relative', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
          {!loaded && <SkeletonShimmer style={{ position: 'absolute', inset: 0 }} />}
          {artwork.preview_url && (
            <img src={artwork.preview_url} alt={artwork.title} loading="lazy" decoding="async"
              onLoad={() => setLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} />
          )}
          {artwork.offer_pct && (
            <div style={{ position: 'absolute', top: 6, left: 6, background: '#E24B4A', color: '#FCEBEB', fontSize: 9, padding: '2px 6px', borderRadius: 20, pointerEvents: 'none' }}>
              -{artwork.offer_pct}%
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
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artwork.painting_by || name}</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>From </span>
            {formatMVR(fromPrice)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function SkeletonShimmer({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-border) 50%, var(--color-surface) 75%)',
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
        <div style={{ height: 20, width: 140, background: 'var(--color-surface)', borderRadius: 4, marginBottom: 16 }} />
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
