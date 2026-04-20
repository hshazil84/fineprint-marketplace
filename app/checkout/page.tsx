'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR, PRINTING_FEES, SIZE_DIMENSIONS } from '@/lib/pricing'
import toast from 'react-hot-toast'
import Header from '@/app/components/Header'

export default function CheckoutPage() {
  const router = useRouter()
  const [checkoutData, setCheckoutData] = useState<any>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'swipe'>('bank_transfer')
  const [form, setForm] = useState({ name: '', email: '', phone: '', island: '', atoll: '', notes: '' })
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const raw = localStorage.getItem('fp_checkout')
    if (!raw) { router.push('/storefront'); return }
    setCheckoutData(JSON.parse(raw))
  }, [])

  if (!checkoutData) return null

  const prices = calculatePrices(
    checkoutData.artistPrice,
    checkoutData.offerPct || 0,
    checkoutData.offerLabel,
    deliveryMethod,
    checkoutData.printSize,
  )

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
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId:       checkoutData.artworkId,
          artworkSku:      checkoutData.artworkSku,
          artworkTitle:    checkoutData.artworkTitle,
          artistName:      checkoutData.artistName,
          artistId:        checkoutData.artistId,
          buyerId:         user?.id || null,
          buyerName:       form.name,
          buyerEmail:      form.email,
          buyerPhone:      form.phone,
          printSize:       checkoutData.printSize,
          deliveryMethod,
          deliveryIsland:  form.island,
          deliveryAtoll:   form.atoll,
          deliveryNotes:   form.notes,
          originalPrice:   checkoutData.artistPrice,
          offerLabel:      checkoutData.offerLabel,
          offerPct:        checkoutData.offerPct,
          printingFee:     prices.printingFee,
          handlingFee:     prices.handlingFee,
          totalPaid:       prices.totalPaid,
          fpCommission:    prices.platformFeeAmt,
          artistEarnings:  prices.artistEarnings,
          newsletterOptIn,
          isGuest:         !user,
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
        formData.append('totalPaid', prices.totalPaid.toString())
        await fetch('/api/orders/slip', { method: 'POST', body: formData })
      }

      localStorage.setItem('fp_confirmed', JSON.stringify({
        invoiceNumber: orderData.invoiceNumber,
        orderSku:      orderData.orderSku,
        deliveryMethod,
        totalPaid:     prices.totalPaid,
        paymentMethod,
      }))
      localStorage.removeItem('fp_checkout')
      router.push('/order-confirmed')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const sizeLabel = checkoutData.printSize + (SIZE_DIMENSIONS[checkoutData.printSize] ? ' (' + SIZE_DIMENSIONS[checkoutData.printSize] + ')' : '')

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Complete your order</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>Choose your payment method and submit your order</p>

        <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>

          {/* LEFT COL */}
          <div>
            {/* Your details */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Your details</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                No account needed — just fill in your details below.
              </p>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Ali" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Your invoice and order updates will be sent here
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+960 xxx xxxx" />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', marginTop: 8 }}>
                <input type="checkbox" checked={newsletterOptIn}
                  onChange={e => setNewsletterOptIn(e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  Notify me about new artworks and offers from FinePrint Studio
                </span>
              </label>
            </div>

            {/* Delivery */}
            <div className="card">
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Delivery method</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { id: 'delivery', title: 'Deliver to me', desc: 'Anywhere in the Maldives', price: '+ MVR 100', priceColor: 'var(--color-text)' },
                  { id: 'pickup', title: 'Pick up', desc: 'Collect from our Male studio', price: 'Free', priceColor: '#1D9E75' },
                ].map(opt => (
                  <div key={opt.id} onClick={() => setDeliveryMethod(opt.id as any)}
                    style={{
                      border: deliveryMethod === opt.id ? '2px solid var(--color-text)' : '0.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)', padding: 14, cursor: 'pointer',
                      background: deliveryMethod === opt.id ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                    }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{opt.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{opt.desc}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8, color: opt.priceColor }}>{opt.price}</p>
                  </div>
                ))}
              </div>
              {deliveryMethod === 'delivery' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Island</label>
                    <input className="form-input" placeholder="e.g. Hulhumale"
                      value={form.island} onChange={e => setForm({ ...form, island: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Atoll</label>
                    <input className="form-input" placeholder="e.g. Kaafu Atoll"
                      value={form.atoll} onChange={e => setForm({ ...form, atoll: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-input" placeholder="Apartment, landmark, or special instructions..."
                      value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>FinePrint Studio — Male</p>
                  {[
                    ['Address', 'Confirmed at order approval'],
                    ['Hours', 'Sun - Thu, 9 am - 6 pm'],
                    ['Contact', 'hello@fineprintmv.com'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 3 }}>
                      <span style={{ minWidth: 60 }}>{k}</span><span>{v}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    We will email you when your print is ready for collection.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COL */}
          <div>
            {/* Order summary */}
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Order summary</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {checkoutData.previewUrl && (
                  <img src={checkoutData.previewUrl} alt=""
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{checkoutData.artworkTitle}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>by {checkoutData.artistName}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{sizeLabel}</p>
                  <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>
                    {checkoutData.artworkSku}-{checkoutData.printSize}
                  </span>
                </div>
              </div>
              {checkoutData.offerPct ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>Original price</span>
                    <span style={{ textDecoration: 'line-through' }}>
                      {formatMVR(checkoutData.artistPrice + (PRINTING_FEES[checkoutData.printSize] || 200))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#E24B4A', marginBottom: 4 }}>
                    <span>{checkoutData.offerLabel} (-{checkoutData.offerPct}%)</span>
                    <span>- {formatMVR(prices.discountAmount)}</span>
                  </div>
                </>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span>Artwork price</span>
                <span>{formatMVR(checkoutData.artistPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span>{sizeLabel} giclee printing</span>
                <span>{formatMVR(prices.printingFee)}</span>
              </div>
              {deliveryMethod === 'delivery' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>Handling and delivery</span><span>{formatMVR(prices.handlingFee)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1D9E75', marginBottom: 4 }}>
                  <span>Pickup</span><span>Free</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500, borderTop: '0.5px solid var(--color-border)', marginTop: 8, paddingTop: 10 }}>
                <span>Total</span>
                <span>{formatMVR(prices.totalPaid)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="card">
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Payment method</p>

              {/* Bank transfer option */}
              <div
                onClick={() => setPaymentMethod('bank_transfer')}
                style={{
                  border: paymentMethod === 'bank_transfer' ? '2px solid var(--color-text)' : '0.5px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: 14,
                  cursor: 'pointer',
                  marginBottom: 10,
                  background: paymentMethod === 'bank_transfer' ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: paymentMethod === 'bank_transfer' ? 12 : 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: paymentMethod === 'bank_transfer' ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Bank transfer — BML</p>
                </div>
                {paymentMethod === 'bank_transfer' && (
                  <div style={{ paddingLeft: 24 }}>
                    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      {[
                        ['Bank', 'Bank of Maldives (BML)'],
                        ['Account name', 'Hasan Shazil'],
                        ['Account number', '7703230358101'],
                        ['Amount', formatMVR(prices.totalPaid)],
                      ].map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{k}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontSize: k === 'Amount' ? 17 : 13, fontWeight: 500, fontFamily: k === 'Account number' ? 'var(--font-mono)' : 'inherit' }}>{v}</p>
                            {k === 'Account number' && (
                              <button
                                onClick={e => { e.stopPropagation(); copyAccountNumber() }}
                                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '0.5px solid var(--color-border)', background: copied ? '#1D9E75' : 'var(--color-background-secondary)', color: copied ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                              >
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                      Transfer the exact amount then upload your slip below.
                    </p>
                    <div className="upload-zone" onClick={() => document.getElementById('slip-input')?.click()}>
                      <p style={{ fontSize: 20, marginBottom: 6 }}>📎</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {slipFile ? slipFile.name : 'Tap to upload transfer slip'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>JPG, PNG or PDF</p>
                    </div>
                    <input type="file" id="slip-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleSlip} />
                    {slipPreview && (
                      <img src={slipPreview} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 10, pointerEvents: 'none' }} />
                    )}
                  </div>
                )}
              </div>

              {/* Swipe option */}
              <div
                onClick={() => setPaymentMethod('swipe')}
                style={{
                  border: paymentMethod === 'swipe' ? '2px solid var(--color-text)' : '0.5px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: 14,
                  cursor: 'pointer',
                  marginBottom: 16,
                  background: paymentMethod === 'swipe' ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: paymentMethod === 'swipe' ? 12 : 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: paymentMethod === 'swipe' ? '5px solid #1a1a1a' : '1.5px solid var(--color-border)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src="/swipe-logo.svg" alt="Swipe" style={{ height: 35, width: 'auto', display: 'block' }} />
                  </div>
                </div>

                      <p style={{ fontSize: 12, fontWeight: 500, marginTop: 8, color: 'var(--color-text)' }}>
                        Amount: {formatMVR(prices.totalPaid)}
                      </p>
                    </div>
                    <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 12, color: '#0F6E56', lineHeight: 1.6 }}>
                        Open your Swipe app, send <strong>{formatMVR(prices.totalPaid)}</strong> to <strong>hasan@swipe</strong> then tap Submit order below.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button className="btn btn-primary btn-full"
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : paymentMethod === 'swipe' ? 'I have paid via Swipe — Submit order' : 'Submit order'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
                By submitting you agree to our{' '}
                <a href="/terms" style={{ color: '#1D9E75' }}>Terms and Conditions</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
