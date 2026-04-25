'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR, buildOrderSKU, PRINTING_FEES, SIZES, getPaperAddOn, getPaperOption, DEFAULT_PAPER } from '@/lib/pricing'
import { useCart } from '@/lib/cart'
import { AvatarDisplay } from '@/app/artist/components/ProfileTab'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/app/components/Header'

// ── Animated MVR ─────────────────────────────────────────────────────────
function AnimatedMVR({ amount, size = 16 }: { amount: number; size?: number }) {
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setAnimKey(k => k + 1) }, [amount])
  const digits = amount.toLocaleString()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, fontSize: size, fontWeight: 500 }}>
      <span>MVR </span>
      <span key={animKey} className="t-digit-group is-animating">
        {digits.split('').map((char, i) => (
          <span
            key={i}
            className="t-digit"
            {...(i >= 2 && i < 4 ? { 'data-stagger': '1' } : {})}
            {...(i >= 4 ? { 'data-stagger': '2' } : {})}
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function ArtworkPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [artwork, setArtwork]               = useState<any>(null)
  const [artist, setArtist]                 = useState<any>(null)
  const [related, setRelated]               = useState<any[]>([])
  const [galleryImages, setGalleryImages]   = useState<any[]>([])
  const [activeImage, setActiveImage]       = useState<string | null>(null)
  const [selectedSize, setSelectedSize]     = useState('A4')
  const [qty, setQty]                       = useState(1)
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [waitlistEmail, setWaitlistEmail]   = useState('')
  const [waitlistDone, setWaitlistDone]     = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const { add, has } = useCart()
  const supabase = createClient()

  useEffect(() => { fetchArtwork() }, [id])

  // Reset qty when size changes
  useEffect(() => { setQty(1) }, [selectedSize])

  async function fetchArtwork() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(*)')
      .eq('id', id)
      .single()
    if (!data) return
    setArtwork(data)
    setArtist(data.profiles)
    setActiveImage(data.preview_url)
    if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[0])

    const { data: gallery } = await supabase
      .from('artwork_images')
      .select('*')
      .eq('artwork_id', data.id)
      .order('sort_order', { ascending: true })
    setGalleryImages(gallery || [])

    const { data: rel } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name)')
      .eq('artist_id', data.artist_id)
      .eq('status', 'approved')
      .neq('id', id)
      .limit(3)
    setRelated(rel || [])
  }

  async function joinWaitlist() {
    if (!waitlistEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitlistEmail)) {
      toast.error('Please enter a valid email'); return
    }
    setWaitlistLoading(true)
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id, email: waitlistEmail }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setWaitlistDone(true)
      toast.success("We'll notify you when this is back in stock!")
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setWaitlistLoading(false)
    }
  }

  if (!artwork) return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>
    </div>
  )

  const paperType     = artwork.paper_type || DEFAULT_PAPER
  const paperOption   = getPaperOption(paperType)
  const paperAddOn    = getPaperAddOn(paperType, selectedSize)
  const availableSizes = artwork.sizes || SIZES
  const prices        = calculatePrices(artwork.price, artwork.offer_pct || 0, artwork.offer_label, 'delivery', selectedSize, paperType)
  const lineTotal     = prices.artworkLineItem * qty
  const orderSKU      = buildOrderSKU(artwork.sku, selectedSize)
  const alreadyInCart = has(artwork.id, selectedSize)

  // Edition logic
  const editionSize  = artwork.edition_size
  const editionsSold = artwork.editions_sold || 0
  const remaining    = editionSize ? editionSize - editionsSold : null
  const isLimited    = !!editionSize
  const isSoldOut    = isLimited && remaining === 0
  const isLowStock   = isLimited && remaining !== null && remaining > 0 && remaining <= 10
  const maxQty       = remaining !== null ? Math.min(10, remaining) : 10

  const allThumbnails = [
    { url: artwork.preview_url, isMain: true },
    ...galleryImages.map(g => ({ url: g.url, isMain: false })),
  ]

  function addToCart() {
    if (isSoldOut) return
    for (let i = 0; i < qty; i++) {
      add({
        artworkId:    artwork.id,
        artworkSku:   artwork.sku,
        artworkTitle: artwork.title,
        artistName:   artist?.display_name || artist?.full_name,
        artistId:     artwork.artist_id,
        printSize:    selectedSize,
        artistPrice:  artwork.price,
        printingFee:  prices.totalPrintFee,
        offerLabel:   artwork.offer_label,
        offerPct:     artwork.offer_pct,
        previewUrl:   artwork.preview_url,
      })
    }
    toast.success(qty > 1 ? qty + '× added to cart!' : 'Added to cart!')
  }

  function buyNow() {
    if (isSoldOut) return
    for (let i = 0; i < qty; i++) {
      add({
        artworkId:    artwork.id,
        artworkSku:   artwork.sku,
        artworkTitle: artwork.title,
        artistName:   artist?.display_name || artist?.full_name,
        artistId:     artwork.artist_id,
        printSize:    selectedSize,
        artistPrice:  artwork.price,
        printingFee:  prices.totalPrintFee,
        offerLabel:   artwork.offer_label,
        offerPct:     artwork.offer_pct,
        previewUrl:   artwork.preview_url,
      })
    }
    router.push('/checkout')
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>

      {/* ── Animation CSS ── */}
      <style>{`
        :root {
          --digit-dur: 500ms;
          --digit-distance: 8px;
          --digit-stagger: 70ms;
          --digit-blur: 2px;
          --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
          --digit-dir-x: 0;
          --digit-dir-y: 1;
        }
        @keyframes t-digit-pop-in {
          0% {
            transform: translate(
              calc(var(--digit-distance) * var(--digit-dir-x)),
              calc(var(--digit-distance) * var(--digit-dir-y))
            );
            opacity: 0;
            filter: blur(var(--digit-blur));
          }
          100% { transform: translate(0, 0); opacity: 1; filter: blur(0); }
        }
        .t-digit-group { display: inline-flex; align-items: baseline; }
        .t-digit { display: inline-block; will-change: transform, opacity, filter; }
        .t-digit-group.is-animating .t-digit {
          animation: t-digit-pop-in var(--digit-dur) var(--digit-ease) both;
        }
        .t-digit-group.is-animating .t-digit[data-stagger="1"] {
          animation-delay: var(--digit-stagger);
        }
        .t-digit-group.is-animating .t-digit[data-stagger="2"] {
          animation-delay: calc(var(--digit-stagger) * 2);
        }
        @media (prefers-reduced-motion: reduce) {
          .t-digit-group .t-digit { animation: none !important; }
        }
      `}</style>

      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <Link href="/storefront" className="btn btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          ← Back
        </Link>
        <div className="grid-2" style={{ gap: 40, alignItems: 'start' }}>

          {/* LEFT — image + gallery */}
          <div>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-surface)', position: 'relative', marginBottom: galleryImages.length > 0 ? 10 : 0 }}>
              {activeImage ? (
                <img src={activeImage} alt={artwork.title} style={{ width: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none', objectFit: 'contain', maxHeight: 520 }} />
              ) : (
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-hint)', fontSize: 13 }}>No preview available</div>
              )}
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }} onContextMenu={e => e.preventDefault()} />

              {/* Badges */}
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6, zIndex: 20, pointerEvents: 'none', flexWrap: 'wrap' }}>
                {artwork.offer_pct ? (
                  <span style={{ background: 'var(--color-red)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
                    {artwork.offer_pct}% off
                  </span>
                ) : null}
                {isSoldOut && (
                  <span style={{ background: '#1a1a1a', color: '#fff', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>Sold out</span>
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
            </div>

            {allThumbnails.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + allThumbnails.length + ', 1fr)', gap: 8 }}>
                {allThumbnails.map((thumb, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImage(thumb.url)}
                    style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', border: activeImage === thumb.url ? '2px solid #1a1a1a' : '0.5px solid var(--color-border)', transition: 'border-color 0.15s', background: 'var(--color-surface)', position: 'relative' }}
                  >
                    <img src={thumb.url} alt={'View ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', inset: 0 }} onContextMenu={e => e.preventDefault()} />
                  </div>
                ))}
              </div>
            )}
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

            {/* Edition status */}
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

            {/* Price breakdown */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: paperAddOn > 0 ? 4 : 8 }}>
                <span>{selectedSize} giclée printing</span>
                <span>{formatMVR(prices.printingFee)}</span>
              </div>
              {paperAddOn > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#633806', marginBottom: 8 }}>
                  <span>Paper upgrade · {paperType}</span>
                  <span>+{formatMVR(paperAddOn)}</span>
                </div>
              )}

              {/* Print price — animated, qty-aware */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid var(--color-border)', paddingTop: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  {qty > 1 ? 'Print price ×' + qty : 'Print price'}
                </span>
                <AnimatedMVR amount={lineTotal} size={16} />
              </div>
              {qty > 1 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {formatMVR(prices.artworkLineItem)} each
                </p>
              )}

              {/* Paper type line */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>🖨</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Printed on <strong>Hahnemühle {paperType}</strong>
                  {paperOption && <span style={{ color: 'var(--color-text-hint)' }}> · {paperOption.description}</span>}
                </span>
              </div>

              <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6 }}>
                + MVR 100 delivery fee at checkout · or free pickup from Malé studio
              </p>
            </div>

            <span className="sku-tag" style={{ marginBottom: 20, display: 'inline-block', fontSize: 13 }}>
              {orderSKU}
            </span>

            {/* CTA — sold out vs normal */}
            {isSoldOut ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#A32D2D', marginBottom: 4 }}>This edition is sold out</p>
                  <p style={{ fontSize: 13, color: '#A32D2D', opacity: 0.8, lineHeight: 1.6 }}>
                    All {editionSize} prints have been sold. Leave your email and we'll notify you if more become available.
                  </p>
                </div>
                {waitlistDone ? (
                  <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>✓</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0F6E56' }}>You're on the waitlist</p>
                      <p style={{ fontSize: 12, color: '#1D9E75', marginTop: 2 }}>We'll email {waitlistEmail} when this is restocked.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={e => setWaitlistEmail(e.target.value)}
                      placeholder="your@email.com"
                      onKeyDown={e => e.key === 'Enter' && joinWaitlist()}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                    />
                    <button
                      onClick={joinWaitlist}
                      disabled={waitlistLoading}
                      style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0, opacity: waitlistLoading ? 0.6 : 1 }}
                    >
                      {waitlistLoading ? '...' : 'Notify me'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>

                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Quantity</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: qty <= 1 ? 'default' : 'pointer', fontSize: 18, color: qty <= 1 ? 'var(--color-text-muted)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty <= 1 ? 0.35 : 1 }}
                    >−</button>
                    <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 500, borderLeft: '0.5px solid var(--color-border)', borderRight: '0.5px solid var(--color-border)', padding: '6px 0', lineHeight: '24px' }}>
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty}
                      style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: qty >= maxQty ? 'default' : 'pointer', fontSize: 18, color: qty >= maxQty ? 'var(--color-text-muted)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty >= maxQty ? 0.35 : 1 }}
                    >+</button>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={alreadyInCart ? undefined : addToCart}
                  style={alreadyInCart ? { opacity: 0.5, cursor: 'default' } : {}}
                  disabled={alreadyInCart}
                >
                  {alreadyInCart ? 'Added to cart ✓' : qty > 1 ? 'Add ' + qty + ' to cart' : 'Add to cart'}
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-full" onClick={buyNow} style={{ flex: 1 }}>Checkout</button>
                  <button className="btn btn-full" onClick={() => router.push('/storefront')} style={{ flex: 1 }}>Continue shopping</button>
                </div>
                {isLowStock && (
                  <p style={{ fontSize: 12, color: '#633806', textAlign: 'center', marginTop: 4 }}>
                    🔥 Only {remaining} prints left — order before they're gone!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

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
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            <AvatarDisplay profile={artist} size={64} />
            <div>
              <p style={{ fontSize: 18, fontWeight: 500 }}>{displayName}</p>
              {artist.location && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{artist.location}</p>}
              {artist.bio && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.6 }}>{artist.bio}</p>}
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
