'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR, buildOrderSKU, PRINTING_FEES, SIZES } from '@/lib/pricing'
import { useCart } from '@/lib/cart'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/app/components/Header'

export default function ArtworkPage() {
  const { id } = useParams()
  const router = useRouter()
  const [artwork, setArtwork] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [selectedSize, setSelectedSize] = useState('A4')
  const [showArtistModal, setShowArtistModal] = useState(false)
  const { add, has } = useCart()
  const supabase = createClient()

  useEffect(() => { fetchArtwork() }, [id])

  async function fetchArtwork() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(*)')
      .eq('id', id)
      .single()
    if (!data) return
    setArtwork(data)
    setArtist(data.profiles)
    if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[0])
    const { data: rel } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name)')
      .eq('artist_id', data.artist_id)
      .eq('status', 'approved')
      .neq('id', id)
      .limit(3)
    setRelated(rel || [])
  }

  if (!artwork) return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>
    </div>
  )

  const availableSizes = artwork.sizes || SIZES
  const prices = calculatePrices(artwork.price, artwork.offer_pct || 0, artwork.offer_label, 'delivery', selectedSize)
  const orderSKU = buildOrderSKU(artwork.sku, selectedSize)
  const alreadyInCart = has(artwork.id, selectedSize)

  function addToCart() {
    add({
      artworkId:    artwork.id,
      artworkSku:   artwork.sku,
      artworkTitle: artwork.title,
      artistName:   artist?.display_name || artist?.full_name,
      artistId:     artwork.artist_id,
      printSize:    selectedSize,
      artistPrice:  artwork.price,
      printingFee:  PRINTING_FEES[selectedSize] || PRINTING_FEES['A4'],
      offerLabel:   artwork.offer_label,
      offerPct:     artwork.offer_pct,
      previewUrl:   artwork.preview_url,
    })
    toast.success('Added to cart!')
  }

  function buyNow() {
    add({
      artworkId:    artwork.id,
      artworkSku:   artwork.sku,
      artworkTitle: artwork.title,
      artistName:   artist?.display_name || artist?.full_name,
      artistId:     artwork.artist_id,
      printSize:    selectedSize,
      artistPrice:  artwork.price,
      printingFee:  PRINTING_FEES[selectedSize] || PRINTING_FEES['A4'],
      offerLabel:   artwork.offer_label,
      offerPct:     artwork.offer_pct,
      previewUrl:   artwork.preview_url,
    })
    router.push('/checkout')
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <Link href="/storefront" className="btn btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          Back
        </Link>
        <div className="grid-2" style={{ gap: 40, alignItems: 'start' }}>

          {/* LEFT — image */}
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-surface)', position: 'relative' }}>
              {artwork.preview_url ? (
                <img
                  src={artwork.preview_url}
                  alt={artwork.title}
                  style={{ width: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none', objectFit: 'contain', maxHeight: 520 }}
                />
              ) : (
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-hint)', fontSize: 13 }}>
                  No preview available
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }} onContextMenu={e => e.preventDefault()} />
            </div>
            {artwork.offer_pct ? (
              <div style={{ position: 'absolute', top: 14, left: 14, background: 'var(--color-red)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, zIndex: 20, pointerEvents: 'none' }}>
                {artwork.offer_pct}% off
              </div>
            ) : null}
          </div>

          {/* RIGHT — details */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>
              {artwork.title}
            </h1>
            <button
              onClick={() => setShowArtistModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, padding: 0, textDecoration: 'underline' }}
            >
              by {artist?.display_name || artist?.full_name}
            </button>
            <div style={{ marginBottom: 16 }}>
              <span className="sku-tag">Artwork SKU: {artwork.sku}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
              {artwork.description}
            </p>
            <div className="divider" />
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Select print size</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {availableSizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className="btn"
                  style={selectedSize === size ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)' } : {}}
                >
                  {size}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16 }}>
              {artwork.offer_pct ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>Original artwork price</span>
                    <span style={{ textDecoration: 'line-through' }}>{formatMVR(artwork.price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-red)', marginBottom: 4 }}>
                    <span>{artwork.offer_label} (-{artwork.offer_pct}%)</span>
                    <span>- {formatMVR(prices.discountAmount)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>Artwork price</span>
                  <span>{formatMVR(artwork.price)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                <span>{selectedSize} giclee printing</span>
                <span>{formatMVR(prices.printingFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 500, borderTop: '0.5px solid var(--color-border)', paddingTop: 8 }}>
                <span>Print price</span>
                <span>{formatMVR(prices.artworkLineItem)}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6 }}>
                + MVR 100 delivery fee at checkout · or free pickup from Male studio
              </p>
            </div>

            <span className="sku-tag" style={{ marginBottom: 20, display: 'inline-block', fontSize: 13 }}>
              {orderSKU}
            </span>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={alreadyInCart ? undefined : addToCart}
                style={alreadyInCart ? { opacity: 0.5, cursor: 'default' } : {}}
                disabled={alreadyInCart}
              >
                {alreadyInCart ? 'Added to cart ✓' : 'Add to cart'}
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-full" onClick={buyNow} style={{ flex: 1 }}>
                  Checkout
                </button>
                <button className="btn btn-full" onClick={() => router.push('/storefront')} style={{ flex: 1 }}>
                  Continue shopping
                </button>
              </div>
            </div>
          </div>
          {/* END RIGHT */}

        </div>
        {/* END grid-2 */}

        {related.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 20 }}>
              More by {artist?.display_name || artist?.full_name}
            </h2>
            <div className="grid-3">
              {related.map((rel: any) => (
                <Link key={rel.id} href={'/artwork/' + rel.id} style={{ textDecoration: 'none' }}>
                  <div className="artwork-card">
                    <div style={{ background: 'var(--color-surface)' }}>
                      {rel.preview_url ? (
                        <img src={rel.preview_url} alt={rel.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                      ) : (
                        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-hint)' }}>No preview</div>
                      )}
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

      {showArtistModal && artist && (
        <ArtistModal artist={artist} onClose={() => setShowArtistModal(false)} artworks={[artwork, ...related]} />
      )}
    </div>
  )
}

function ArtistModal({ artist, onClose, artworks }: any) {
  const displayName = artist.display_name || artist.full_name
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 500, color: '#085041', flexShrink: 0 }}>
              {displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 500 }}>{displayName}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{artist.location}</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.6 }}>{artist.bio}</p>
              {artist.instagram && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>{artist.instagram}</p>}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', padding: '0 24px', marginBottom: 12 }}>Other works</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '0 24px 24px' }}>
          {artworks.map((w: any) => (
            <Link key={w.id} href={'/artwork/' + w.id} onClick={onClose} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '0.5px solid var(--color-border)', cursor: 'pointer' }}>
                {w.preview_url ? (
                  <img src={w.preview_url} alt={w.title} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : (
                  <div style={{ height: 90, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-text-hint)' }}>No preview</div>
                )}
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>{w.title}</p>
                  <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{w.sku}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
