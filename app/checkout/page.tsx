'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR, PRINTING_FEES, SIZE_DIMENSIONS } from '@/lib/pricing'
import { useCart } from '@/lib/cart'
import toast from 'react-hot-toast'
import Header from '@/app/components/Header'

// ── Animated MVR number ───────────────────────────────────────────────────
function AnimatedMVR({ amount, size = 15 }: { amount: number; size?: number }) {
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

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clear, setQty } = useCart()
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [paymentMethod, setPaymentMethod]   = useState<'bank_transfer' | 'swipe'>('bank_transfer')
  const [form, setForm]                     = useState({ name: '', email: '', phone: '', island: '', atoll: '', notes: '' })
  const [slipFile, setSlipFile]             = useState<File | null>(null)
  const [slipPreview, setSlipPreview]       = useState<string | null>(null)
  const [submitting, setSubmitting]         = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [copied, setCopied]                 = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (items.length === 0) router.push('/storefront')
  }, [items])

  if (items.length === 0) return null

  const itemPrices  = items.map(item =>
    calculatePrices(item.artistPrice, item.offerPct || 0, item.offerLabel, deliveryMethod, item.printSize)
  )
  const subtotal    = itemPrices.reduce((s, p, i) => s + p.artworkLineItem * items[i].quantity, 0)
  const handlingFee = deliveryMethod === 'delivery' ? 100 : 0
  const totalPaid   = subtotal + handlingFee
  const totalItems  = items.reduce((s, i) => s + i.quantity, 0)

  function handleSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setSlipPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  function copyAccountNumber() {
    navigator.clipboard.writeText('7703230358101')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.phone) { toast.error('Please fill in your name, email and phone'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { toast.error('Please enter a valid email address'); return }
    const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/
    if (!phoneRegex.test(form.phone)) { toast.error('Please enter a valid phone number'); return }
    if (deliveryMethod === 'delivery' && (!form.island || !form.atoll)) { toast.error('Please enter your island and atoll'); return }
    if (paymentMethod === 'bank_transfer' && !slipFile) { toast.error('Please upload your BML transfer slip'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const expandedItems = items.flatMap((item, i) => {
        const p = itemPrices[i]
        return Array.from({ length: item.quantity }, () => ({
          artworkId:      item.artworkId,
          artworkSku:     item.artworkSku,
          artworkTitle:   item.artworkTitle,
          artistName:     item.artistName,
          artistId:       item.artistId,
          printSize:      item.printSize,
          originalPrice:  item.artistPrice,
          offerLabel:     item.offerLabel,
          offerPct:       item.offerPct,
          printingFee:    p.printingFee,
          printPrice:     p.artworkLineItem,
          fpCommission:   p.platformFeeAmt,
          artistEarnings: p.artistEarnings,
          discountAmount: p.discountAmount,
          quantity:       item.quantity,
        }))
      })

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:          expandedItems,
          buyerId:        user?.id || null,
          buyerName:      form.name,
          buyerEmail:     form.email,
          buyerPhone:     form.phone,
          deliveryMethod,
          deliveryIsland: form.island,
          deliveryAtoll:  form.atoll,
          deliveryNotes:  form.notes,
          handlingFee,
          totalPaid,
          newsletterOptIn,
          isGuest:        !user,
          paymentMethod,
        }),
      })

      const orderData = await res.json()
      if (!orderData.success) throw new Error(orderData.error)

      if (paymentMethod === 'bank_transfer' && slipFile) {
        const formData = new FormData()
        formData.append('slip', slipFile)
        formData.append('invoiceNumber', orderData.invoiceNumber)
        formData.append('orderSku', orderData.orderSku)
        formData.append('buyerName', form.name)
        formData.append('totalPaid', totalPaid.toString())
        await fetch('/api/orders/slip', { method: 'POST', body: formData })
      }

      localStorage.setItem('fp_confirmed', JSON.stringify({
        invoiceNumber:  orderData.invoiceNumber,
        orderSku:       orderData.orderSku,
        deliveryMethod,
        totalPaid,
        paymentMethod,
        itemCount:      totalItems,
        items:          items.map((item, i) => ({
          title:      item.artworkTitle,
          artistName: item.artistName,
          printSize:  item.printSize,
          quantity:   item.quantity,
          price:      itemPrices[i].artworkLineItem * item.quantity,
          previewUrl: item.previewUrl,
        })),
      }))

      clear()
      router.push('/order-confirmed')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const optionStyle = (active: boolean) => ({
    border: active ? '1.5px solid rgba(0,0,0,0.7)' : '0.5px solid var(--color-border)',
    borderRadius: 12, padding: 14, cursor: 'pointer', marginBottom: 10,
    background: active ? 'var(--color-surface)' : 'var(--color-bg)',
    transition: 'all 0.15s',
  })

  const radioStyle = (active: boolean) => ({
    width: 16, height: 16, borderRadius: '50%',
    border: active ? '5px solid rgba(0,0,0,0.7)' : '1.5px solid var(--color-border)',
    flexShrink: 0, transition: 'all 0.15s',
  })

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>

      <style>{`
        /* ── Digit pop-in animation ── */
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

        /* ── Shine sweep button ── */
        .fp-shine-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            45deg,
            transparent 25%,
            rgba(255,255,255,0.18) 50%,
            transparent 75%,
            transparent 100%
          );
          background-size: 250% 250%, 100% 100%;
          background-position: 200% 0, 0 0;
          background-repeat: no-repeat;
          transition: none;
          pointer-events: none;
        }
        .fp-shine-btn:hover:not(:disabled)::before {
          background-position: -100% 0, 0 0;
          transition: background-position 1500ms ease;
        }
        .fp-shine-btn:active:not(:disabled) {
          transform: scale(0.99);
        }
      `}</style>

      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Complete your order</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>Choose your payment method and submit your order</p>

        <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>

          {/* LEFT COL */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Your details</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>No account needed — just fill in your details below.</p>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Ali" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Your invoice and order updates will be sent here</p>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+960 xxx xxxx" />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', marginTop: 8 }}>
                <input type="checkbox" checked={newsletterOptIn} onChange={e => setNewsletterOptIn(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Notify me about new artworks and offers from FinePrint Studio</span>
              </label>
            </div>

            <div className="card">
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Delivery method</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { id: 'delivery', title: 'Deliver to me',  desc: 'Anywhere in the Maldives',    price: '+ MVR 100', priceColor: 'var(--color-text)' },
                  { id: 'pickup',   title: 'Pick up',        desc: 'Collect from our Male studio', price: 'Free',      priceColor: '#1D9E75' },
                ].map(opt => (
                  <div key={opt.id} onClick={() => setDeliveryMethod(opt.id as any)} style={optionStyle(deliveryMethod === opt.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={radioStyle(deliveryMethod === opt.id)} />
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{opt.title}</p>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5, paddingLeft: 24 }}>{opt.desc}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, marginTop: 6, paddingLeft: 24, color: opt.priceColor }}>{opt.price}</p>
                  </div>
                ))}
              </div>

              {deliveryMethod === 'delivery' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Island</label>
                    <input className="form-input" placeholder="e.g. Hulhumale" value={form.island} onChange={e => setForm({ ...form, island: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Atoll</label>
                    <input className="form-input" placeholder="e.g. Kaafu Atoll" value={form.atoll} onChange={e => setForm({ ...form, atoll: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-input" placeholder="Apartment, landmark, or special instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>FinePrint Studio — Male</p>
                  {[
                    ['Address', 'H. Dhunburimaage, Janavaree Magu, Malé'],
                    ['Hours',   'Sun - Thu, 9 am - 6 pm'],
                    ['Contact', 'hello@fineprintmv.com'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 3 }}>
                      <span style={{ minWidth: 60 }}>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COL */}
          <div>
            {/* Order summary */}
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                Order summary
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>
                  · {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
              </p>

              {items.map((item, i) => {
                const p         = itemPrices[i]
                const lineTotal = p.artworkLineItem * item.quantity
                const sizeLabel = item.printSize + (SIZE_DIMENSIONS?.[item.printSize] ? ' (' + SIZE_DIMENSIONS[item.printSize] + ')' : '')
                return (
                  <div
                    key={`${item.artworkId}-${item.printSize}`}
                    style={{ display: 'flex', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: i < items.length - 1 ? '0.5px solid var(--color-border)' : 'none' }}
                  >
                    {item.previewUrl && (
                      <img src={item.previewUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artworkTitle}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>by {item.artistName}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1, marginBottom: 8 }}>{sizeLabel}</p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* − qty + */}
                        <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                          <button
                            onClick={() => setQty(item.artworkId, item.printSize, item.quantity - 1)}
                            style={{ width: 28, height: 26, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: 500, borderLeft: '0.5px solid var(--color-border)', borderRight: '0.5px solid var(--color-border)', padding: '3px 0', lineHeight: '20px' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQty(item.artworkId, item.printSize, item.quantity + 1)}
                            disabled={item.quantity >= 10}
                            style={{ width: 28, height: 26, background: 'none', border: 'none', cursor: item.quantity >= 10 ? 'default' : 'pointer', fontSize: 15, color: item.quantity >= 10 ? 'var(--color-text-muted)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.quantity >= 10 ? 0.4 : 1 }}
                          >+</button>
                        </div>

                        {/* Price */}
                        <div style={{ textAlign: 'right' }}>
                          {item.offerPct ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(lineTotal)}</span>
                              {item.quantity === 1 && (
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                                  {formatMVR(item.artistPrice + p.printingFee)}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: '#E24B4A' }}>-{item.offerPct}%</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(lineTotal)}</span>
                          )}
                          {item.quantity > 1 && (
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>
                              {formatMVR(p.artworkLineItem)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>Subtotal</span><span>{formatMVR(subtotal)}</span>
                </div>
                {deliveryMethod === 'delivery' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>Handling and delivery</span><span>{formatMVR(100)}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1D9E75', marginBottom: 4 }}>
                    <span>Pickup</span><span>Free</span>
                  </div>
                )}
                {/* ── Animated total ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid var(--color-border)', marginTop: 8, paddingTop: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>Total</span>
                  <AnimatedMVR amount={totalPaid} size={15} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="card">
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Payment method</p>

              <div onClick={() => setPaymentMethod('bank_transfer')} style={optionStyle(paymentMethod === 'bank_transfer')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={radioStyle(paymentMethod === 'bank_transfer')} />
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Bank transfer — BML</p>
                </div>
                {paymentMethod === 'bank_transfer' && (
                  <div style={{ paddingLeft: 24, marginTop: 12 }}>
                    <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      {[
                        ['Bank',           'Bank of Maldives (BML)'],
                        ['Account name',   'Hasan Shazil'],
                        ['Account number', '7703230358101'],
                        ['Amount',         formatMVR(totalPaid)],
                      ].map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{k}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontSize: k === 'Amount' ? 17 : 13, fontWeight: 500, fontFamily: k === 'Account number' ? 'var(--font-mono)' : 'inherit' }}>{v}</p>
                            {k === 'Account number' && (
                              <button
                                onClick={e => { e.stopPropagation(); copyAccountNumber() }}
                                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '0.5px solid var(--color-border)', background: copied ? '#1D9E75' : 'var(--color-surface)', color: copied ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                              >
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Transfer the exact amount then upload your slip below.</p>
                    <div className="upload-zone" onClick={() => document.getElementById('slip-input')?.click()}>
                      <p style={{ fontSize: 20, marginBottom: 6 }}>📎</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{slipFile ? slipFile.name : 'Tap to upload transfer slip'}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG, PNG or PDF</p>
                    </div>
                    <input type="file" id="slip-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleSlip} />
                    {slipPreview && <img src={slipPreview} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 10, pointerEvents: 'none' }} />}
                  </div>
                )}
              </div>

              <div onClick={() => setPaymentMethod('swipe')} style={optionStyle(paymentMethod === 'swipe')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={radioStyle(paymentMethod === 'swipe')} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Pay via</span>
                    <img src="/swipe-logo.svg" alt="Swipe" style={{ height: 35, width: 'auto', display: 'block' }} />
                  </div>
                </div>
                {paymentMethod === 'swipe' && (
                  <div style={{ paddingLeft: 24, marginTop: 12 }}>
                    <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, color: '#0F6E56', lineHeight: 1.7 }}>
                        Open your Swipe app and send <strong>{formatMVR(totalPaid)}</strong> then tap Submit order below.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Shine submit button ── */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="fp-shine-btn"
                style={{
                  width:        '100%',
                  padding:      '13px 20px',
                  borderRadius: 12,
                  border:       'none',
                  background:   'linear-gradient(to right, #1a1a1a, #2d2d2d)',
                  color:        '#fff',
                  fontSize:     14,
                  fontWeight:   500,
                  cursor:       submitting ? 'default' : 'pointer',
                  opacity:      submitting ? 0.6 : 1,
                  position:     'relative',
                  overflow:     'hidden',
                  fontFamily:   'inherit',
                  letterSpacing: '0.01em',
                  marginTop:    4,
                }}
              >
                {submitting ? 'Submitting...' : paymentMethod === 'swipe' ? 'I have paid via Swipe — Submit order' : 'Submit order'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
                By submitting you agree to our <a href="/terms" style={{ color: '#1D9E75' }}>Terms and Conditions</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
