'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'
import { usePapers } from '@/lib/usePapers'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { AvatarDisplay } from '@/app/artist/components/ProfileTab'
import toast from 'react-hot-toast'

function toHref(value: string, prefix: string): string {
  if (!value) return ''
  if (value.startsWith('http')) return value
  return prefix + value.replace('@', '')
}

function getSocialLinks(profile: any): Array<{ label: string; href: string }> {
  const links: Array<{ label: string; href: string }> = []
  if (profile.instagram) links.push({ label: 'Instagram', href: toHref(profile.instagram, 'https://instagram.com/') })
  if (profile.tiktok)    links.push({ label: 'TikTok',    href: toHref(profile.tiktok,    'https://tiktok.com/@') })
  if (profile.facebook)  links.push({ label: 'Facebook',  href: toHref(profile.facebook,  'https://') })
  if (profile.linkedin)  links.push({ label: 'LinkedIn',  href: toHref(profile.linkedin,  'https://') })
  if (profile.website)   links.push({ label: 'Website',   href: toHref(profile.website,   'https://') })
  return links
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="#FAC775" style={{ flexShrink: 0 }}>
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6" />
    </svg>
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

function ArtworkCard({
  artwork,
  isTopSeller,
  getPaperAddOn,
}: {
  artwork: any
  isTopSeller: boolean
  getPaperAddOn: (paperName: string, size: string) => number
}) {
  const [loaded, setLoaded]           = useState(false)
  const [showNotify, setShowNotify]   = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyDone, setNotifyDone]   = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)

  const sizes     = artwork.sizes || ['A4']
  const paperType = artwork.paper_type || ''
  const fromPrice = artwork.price + Math.min(...sizes.map((s: string) => {
    const base  = PRINTING_FEES[s] || PRINTING_FEES['A4']
    const addOn = getPaperAddOn(paperType, s)
    return base + addOn
  }))

  const editionSize  = artwork.edition_size
  const editionsSold = artwork.editions_sold || 0
  const remaining    = editionSize ? editionSize - editionsSold : null
  const isLimited    = !!editionSize
  const isSoldOut    = isLimited && remaining === 0
  const isLowStock   = isLimited && remaining !== null && remaining > 0 && remaining <= 10

  async function handleNotify() {
    if (!notifyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      toast.error('Please enter a valid email')
      return
    }
    setNotifyLoading(true)
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id, email: notifyEmail }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setNotifyDone(true)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setNotifyLoading(false)
    }
  }

  return (
    <Link href={'/artwork/' + artwork.id} style={{ textDecoration: 'none' }} onClick={e => { if (showNotify) e.preventDefault() }}>
      <div
        style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-background-primary)', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        {/* Image */}
        <div style={{ aspectRatio: '1', position: 'relative', backgroundColor: 'var(--color-background-secondary)', overflow: 'hidden', opacity: isSoldOut ? 0.6 : 1 }}>
          {!loaded && <SkeletonShimmer style={{ position: 'absolute', inset: 0 }} />}
          {artwork.preview_url && (
            <img
              src={artwork.preview_url}
              alt={artwork.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          )}

          {/* Top-left badges */}
          <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
            {artwork.offer_pct && (
              <span style={{ background: '#E24B4A', color: '#FCEBEB', fontSize: 9, padding: '2px 6px', borderRadius: 20 }}>
                -{artwork.offer_pct}%
              </span>
            )}
            {isSoldOut && (
              <span style={{ background: '#2C2C2A', color: '#F1EFE8', fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
                Sold out
              </span>
            )}
            {isLowStock && (
              <span style={{ background: '#FAEEDA', color: '#633806', fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 500, border: '0.5px solid #EF9F27' }}>
                Only {remaining} left
              </span>
            )}
            {isLimited && !isSoldOut && !isLowStock && (
              <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 20 }}>
                Limited edition
              </span>
            )}
          </div>

          {/* Top-right: top seller */}
          {isTopSeller && !isSoldOut && (
            <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 2, background: '#1a1a1a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 20, pointerEvents: 'none' }}>
              <StarIcon />Top
            </div>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '10px 12px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 1, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {artwork.title}
          </p>
          {artwork.painting_by && (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>by {artwork.painting_by}</p>
          )}

          {isSoldOut ? (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Limited edition · sold out
            </p>
          ) : (
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)', marginBottom: isSoldOut ? 8 : 0 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>From </span>
              {formatMVR(fromPrice)}
            </p>
          )}

          {/* Notify me */}
          {isSoldOut && (
            <div onClick={e => e.preventDefault()}>
              {notifyDone ? (
                <p style={{ fontSize: 11, color: '#0F6E56', padding: '4px 0' }}>
                  ✓ We'll notify you when it's back
                </p>
              ) : showNotify ? (
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNotify()}
                    placeholder="your@email.com"
                    style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--color-border)', fontSize: 11, background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                    autoFocus
                  />
                  <button
                    onClick={handleNotify}
                    disabled={notifyLoading}
                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: notifyLoading ? 0.6 : 1 }}
                  >
                    {notifyLoading ? '...' : 'Notify'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNotify(true)}
                  style={{ width: '100%', padding: '6px 0', borderRadius: 8, border: '0.5px solid var(--color-border)', background: 'transparent', fontSize: 11, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'center' }}
                >
                  Notify when available
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function ProfileContent({ profile, artworks, topSellerIds }: { profile: any; artworks: any[]; topSellerIds: Set<number> }) {
  const { getPaperAddOn } = usePapers()
  const displayName = profile.display_name || profile.full_name
  const isClosed    = profile.shop_status === 'closed'
  const socialLinks = getSocialLinks(profile)

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        @media(max-width:768px) {
          .fp-desktop-grid { display: none !important; }
          .fp-mobile-grid  { display: grid !important; }
        }
        @media(min-width:769px) {
          .fp-desktop-grid { display: grid !important; }
          .fp-mobile-grid  { display: none !important; }
        }
      `}</style>

      <Header />

      <div style={{ borderBottom: '0.5px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

            <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--color-border)' }}>
              <AvatarDisplay profile={profile} size={88} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}>{displayName}</h1>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)', background: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 20 }}>
                  FP-{profile.artist_code}
                </span>
                {isClosed && (
                  <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '2px 8px', borderRadius: 20, border: '0.5px solid #EF9F27' }}>
                    Shop temporarily closed
                  </span>
                )}
              </div>
              {profile.location && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{profile.location}</p>
              )}
              {profile.bio && (
                <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.7, marginBottom: 12, maxWidth: 560 }}>{profile.bio}</p>
              )}
              {socialLinks.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socialLinks.map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--font-display)' }}>{artworks.length}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>artworks</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
        {isClosed ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Shop is temporarily closed</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
              {displayName} has temporarily paused their shop. Check back soon!
            </p>
            <Link href="/storefront" style={{ fontSize: 14, color: '#1D9E75', textDecoration: 'none' }}>
              Browse other artworks
            </Link>
          </div>
        ) : artworks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>No artworks listed yet.</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>
              Artworks by {displayName}
              <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>
                · {artworks.length} {artworks.length === 1 ? 'print' : 'prints'}
              </span>
            </p>
            <div className="fp-desktop-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
              {artworks.map(artwork => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  isTopSeller={topSellerIds.has(artwork.id)}
                  getPaperAddOn={getPaperAddOn}
                />
              ))}
            </div>
            <div className="fp-mobile-grid" style={{ display: 'none', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
              {artworks.map(artwork => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  isTopSeller={topSellerIds.has(artwork.id)}
                  getPaperAddOn={getPaperAddOn}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default function ArtistProfilePage() {
  const params     = useParams()
  const artistCode = params.artistCode as string
  const [profile, setProfile]           = useState<any>(null)
  const [artworks, setArtworks]         = useState<any[]>([])
  const [topSellerIds, setTopSellerIds] = useState<Set<number>>(new Set())
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (artistCode) fetchProfile()
  }, [artistCode])

  async function fetchProfile() {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('artist_code', artistCode)
      .eq('role', 'artist')
      .single()

    if (!prof) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setProfile(prof)

    const [artRes, orderRes] = await Promise.all([
      supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', prof.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('artwork_id')
        .eq('status', 'approved'),
    ])

    setArtworks(artRes.data || [])

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

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
        <Header />
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
        <Header />
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Artist not found</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>This artist profile does not exist.</p>
          <Link href="/storefront" style={{ fontSize: 14, color: '#1D9E75', textDecoration: 'none' }}>Browse all artworks</Link>
        </div>
      </div>
    )
  }

  return (
    <ProfileContent
      profile={profile}
      artworks={artworks}
      topSellerIds={topSellerIds}
    />
  )
}
