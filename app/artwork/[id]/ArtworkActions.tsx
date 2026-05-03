'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculatePrices, formatMVR, buildOrderSKU, PRINTING_FEES } from '@/lib/pricing'
import { usePapers } from '@/lib/usePapers'
import { useCart } from '@/lib/cart'
import toast from 'react-hot-toast'

function AnimatedMVR({ amount, size = 16 }: { amount: number; size?: number }) {
  const [animKey, setAnimKey] = useState(0)
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

interface Props {
  artwork: any
  artist: any
}

export default function ArtworkActions({ artwork, artist }: Props) {
  const router = useRouter()
  const { papers, getDefaultPaper, getPaperAddOn } = usePapers()
  const { add, has } = useCart()

  const availableSizes = artwork.sizes || ['A4', 'A3']
  const [selectedSize, setSelectedSize] = useState(availableSizes[0])
  const [qty, setQty] = useState(1)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  const paperType   = artwork.paper_type || getDefaultPaper(artwork.category)
  const paperOption = papers.find((p: any) => p.name === paperType)
  const paperAddOn  = getPaperAddOn(paperType, selectedSize)
  const isPremium   = paperOption ? (paperOption.addOn['A4'] > 0 || paperOption.addOn['A3'] > 0) : false
  const prices      = calculatePrices(artwork.price, artwork.offer_pct || 0, artwork.offer_label, 'delivery', selectedSize, paperType, paperAddOn)
  const lineTotal   = prices.artworkLineItem * qty
  const orderSKU    = buildOrderSKU(artwork.sku, selectedSize)
  const alreadyInCart = has(artwork.id, selectedSize)

  const editionSize  = artwork.edition_size
  const editionsSold = artwork.editions_sold || 0
  const remaining    = editionSize ? editionSize - editionsSold : null
  const isLimited    = !!editionSize
  const isSoldOut    = isLimited && remaining === 0
  const isLowStock   = isLimited && remaining !== null && remaining > 0 && remaining <= 10
  const maxQty       = remaining !== null ? Math.min(10, remaining) : 10

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
        printingFee:  prices.printingFee,
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
        printingFee:  prices.printingFee,
        offerLabel:   artwork.offer_label,
        offerPct:     artwork.offer_pct,
        previewUrl:   artwork.preview_url,
      })
    }
    router.push('/checkout')
  }

  return (
    <>
      {/* Size selector */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Select print size</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {availableSizes.map((size: string) => (
          <button
            key={size}
            onClick={() => { setSelectedSize(size); setQty(1) }}
            className="btn"
            style={selectedSize === size
              ? { background: 'var(--color-text)', color: '#fff', borderColor: 'var(--color-text)' }
              : {}}
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
              <span style={{ textDecoration: 'line-through' }}>{formatMVR(prices.grossPrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-red)', marginBottom: 4 }}>
              <span>{artwork.offer_label} (-{artwork.offer_pct}%)</span>
              <span>- {formatMVR(prices.discountAmount)}</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            <span>Artwork price</span><span>{formatMVR(prices.grossPrice)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: paperAddOn > 0 ? 4 : 8 }}>
          <span>{selectedSize} giclée printing</span><span>{formatMVR(prices.printingFee)}</span>
        </div>
        {paperAddOn > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#633806', marginBottom: 8 }}>
            <span>Paper upgrade · {paperType}</span><span>+{formatMVR(paperAddOn)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid var(--color-border)', paddingTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{qty > 1 ? 'Print price ×' + qty : 'Print price'}</span>
          <AnimatedMVR amount={lineTotal} size={16} />
        </div>
        {qty > 1 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'right' }}>
            {formatMVR(prices.artworkLineItem)} each
          </p>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11 }}>🖨</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Printed on <strong>Hahnemühle {paperType}</strong>
          </span>
          {paperOption && (
            <span style={{
              fontSize: 9, fontWeight: 500, padding: '1px 7px', borderRadius: 20,
              background: isPremium ? '#2C2C2A' : '#D3D1C7',
              color: isPremium ? '#F1EFE8' : '#444441',
            }}>
              {isPremium ? 'Premium' : 'Standard'}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6 }}>
          + MVR 100 delivery fee at checkout · or free pickup from Malé studio
        </p>
      </div>

      <span className="sku-tag" style={{ marginBottom: 20, display: 'inline-block', fontSize: 13 }}>
        {orderSKU}
      </span>

      {/* Sold out / buy */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Quantity</span>
            <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: qty <= 1 ? 'default' : 'pointer', fontSize: 18, color: qty <= 1 ? 'var(--color-text-muted)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty <= 1 ? 0.35 : 1 }}
              >−</button>
              <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 500, borderLeft: '0.5px solid var(--color-border)', borderRight: '0.5px solid var(--color-border)', padding: '6px 0', lineHeight: '24px' }}>{qty}</span>
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
    </>
  )
}
