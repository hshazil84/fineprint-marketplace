// app/artwork/[id]/page.tsx
// Server component — fetches all data on the server before sending to browser
// No skeleton, no loading state, instant content

import { createRouteClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { AvatarDisplay } from '@/app/artist/components/ProfileTab'
import Link from 'next/link'
import Header from '@/app/components/Header'
import ArtworkGallery from './ArtworkGallery'
import ArtworkActions from './ArtworkActions'

export default async function ArtworkPage({ params }: { params: { id: string } }) {
  const supabase = createRouteClient()

  // All three fetches happen in parallel on the server
  const [artworkRes, galleryRes] = await Promise.all([
    supabase
      .from('artworks')
      .select('*, profiles:artist_id(*)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('artwork_images')
      .select('*')
      .eq('artwork_id', params.id)
      .order('sort_order', { ascending: true }),
  ])

  const artwork = artworkRes.data
  if (!artwork) return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>
        Artwork not found.
      </div>
    </div>
  )

  const artist        = artwork.profiles
  const galleryImages = galleryRes.data || []

  // Related artworks
  const { data: related } = await supabase
    .from('artworks')
    .select('*, profiles:artist_id(full_name)')
    .eq('artist_id', artwork.artist_id)
    .eq('status', 'approved')
    .neq('id', params.id)
    .limit(3)

  const editionSize  = artwork.edition_size
  const editionsSold = artwork.editions_sold || 0
  const remaining    = editionSize ? editionSize - editionsSold : null
  const isLimited    = !!editionSize
  const isSoldOut    = isLimited && remaining === 0
  const isLowStock   = isLimited && remaining !== null && remaining > 0 && remaining <= 10

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <style>{`
        :root {
          --digit-dur: 500ms; --digit-distance: 8px; --digit-stagger: 70ms;
          --digit-blur: 2px; --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
          --digit-dir-x: 0; --digit-dir-y: 1;
        }
        @keyframes t-digit-pop-in {
          0% { transform: translate(calc(var(--digit-distance)*var(--digit-dir-x)),calc(var(--digit-distance)*var(--digit-dir-y))); opacity:0; filter:blur(var(--digit-blur)); }
          100% { transform:translate(0,0); opacity:1; filter:blur(0); }
        }
        .t-digit-group { display:inline-flex; align-items:baseline; }
        .t-digit { display:inline-block; will-change:transform,opacity,filter; }
        .t-digit-group.is-animating .t-digit { animation:t-digit-pop-in var(--digit-dur) var(--digit-ease) both; }
        .t-digit-group.is-animating .t-digit[data-stagger="1"] { animation-delay:var(--digit-stagger); }
        .t-digit-group.is-animating .t-digit[data-stagger="2"] { animation-delay:calc(var(--digit-stagger)*2); }
        @media(prefers-reduced-motion:reduce){.t-digit-group .t-digit{animation:none!important;}}
      `}</style>

      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <Link href="/storefront" className="btn btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          ← Back
        </Link>

        <div className="grid-2" style={{ gap: 40, alignItems: 'start' }}>

          {/* LEFT — gallery (client component for interactivity) */}
          <div>
            {/* Offer / edition badges */}
            {(artwork.offer_pct || isSoldOut || isLowStock || isLimited) && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {artwork.offer_pct && (
                  <span style={{ background: 'var(--color-red)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
                    {artwork.offer_pct}% off
                  </span>
                )}
                {isSoldOut && (
                  <span style={{ background: '#1a1a1a', color: '#fff', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
                    Sold out
                  </span>
                )}
                {isLowStock && !isSoldOut && (
                  <span style={{ background: '#FAEEDA', color: '#633806', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20, border: '0.5px solid #EF9F27' }}>
                    Only {remaining} left
                  </span>
                )}
                {isLimited && !isSoldOut && !isLowStock && (
                  <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 400, padding: '4px 10px', borderRadius: 20 }}>
                    Limited edition
                  </span>
                )}
              </div>
            )}

            {/* Gallery — hero + thumbnails below */}
            <ArtworkGallery
              mainImage={artwork.preview_url}
              galleryImages={galleryImages}
              title={artwork.title}
            />
          </div>

          {/* RIGHT — static info + client actions */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>
              {artwork.title}
            </h1>

            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              by {artist?.display_name || artist?.full_name}
            </p>

            {isLimited && (
              <div style={{ marginBottom: 12 }}>
                {isSoldOut ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 20, padding: '4px 12px' }}>
                    <span style={{ fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>Sold out</span>
                    <span style={{ fontSize: 11, color: '#A32D2D' }}>· {editionSize} of {editionSize} sold</span>
                  </div>
                ) : isLowStock ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 20, padding: '4px 12px' }}>
                    <span style={{ fontSize: 12, color: '#633806', fontWeight: 500 }}>Only {remaining} left</span>
                    <span style={{ fontSize: 11, color: '#633806' }}>· {editionsSold} of {editionSize} sold</span>
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 20, padding: '4px 12px' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Limited edition</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>· {editionsSold} of {editionSize} sold</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <span className="sku-tag">Artwork SKU: {artwork.sku}</span>
            </div>

            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
              {artwork.description}
            </p>

            <div className="divider" />

            {/* All interactive parts — client component */}
            <ArtworkActions artwork={artwork} artist={artist} />
          </div>
        </div>

        {/* Related artworks */}
        {related && related.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 20 }}>
              More by {artist?.display_name || artist?.full_name}
            </h2>
            <div className="grid-3">
              {related.map((rel: any) => (
                <Link key={rel.id} href={'/artwork/' + rel.id} style={{ textDecoration: 'none' }}>
                  <div className="artwork-card">
                    <div style={{ background: 'var(--color-surface)' }}>
                      {rel.preview_url
                        ? <img src={rel.preview_url} alt={rel.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                        : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-hint)' }}>No preview</div>
                      }
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{rel.title}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                        <span className="sku-tag">{rel.sku}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(rel.price)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
