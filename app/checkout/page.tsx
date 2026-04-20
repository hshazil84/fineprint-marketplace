'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculatePrices, formatMVR, PRINTING_FEES, SIZE_DIMENSIONS } from '@/lib/pricing'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/app/components/Header'

export default function CheckoutPage() {
  const router = useRouter()
  const [checkoutData, setCheckoutData] = useState<any>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [form, setForm] = useState({ name: '', email: '', phone: '', island: '', atoll: '', notes: '' })
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
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

  async function handleSubmit() {
    if (!form.name || !form.email || !form.phone) { toast.error('Please fill in your name, email and phone'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { toast.error('Please enter a valid email address'); return }
    const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/
    if (!phoneRegex.test(form.phone)) { toast.error('Please enter a valid phone number'); return }
    if (deliveryMethod === 'delivery' && (!form.island || !form.atoll)) { toast.error('Please enter your island and atoll'); return }
    if (!slipFile) { toast.error('Please upload your BML transfer slip'); return }
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
        }),
      })

      const orderData = await res.json()
      if (!orderData.success) throw new Error(orderData.error)

      const formData = new FormData()
      formData.append('slip', slipFile)
      formData.append('invoiceNumber', orderData.invoiceNumber)
      formData.append('orderSku', orderData.orderSku)
      formData.append('buyerName', form.name)
      formData.append('totalPaid', prices.totalPaid.toString())
      await fetch('/api/orders/slip', { method: 'POST', body: formData })

      localStorage.setItem('fp_confirmed', JSON.stringify({
        invoiceNumber: orderData.invoiceNumber,
        orderSku:      orderData.orderSku,
        deliveryMethod,
        totalPaid:     prices.totalPaid,
      }))
      localStorage.removeItem('fp_checkout')
      router.push('/order-confirmed')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const sizeLabel = checkoutData.printSize + (SIZE_DIMENSIONS[checkoutData.printSize] ? ` (${SIZE_DIMENSIONS[checkoutData.printSize]})` : '')

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Complete your order</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>Pay via bank transfer and upload your slip. Thank you.</p>

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

              {/* Newsletter opt-in */}
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
                  { id: 'delivery', icon: '📦', title: 'Deliver to me', desc: 'Anywhere in the Maldives', price: '+ MVR 100', priceColor: 'var(--color-text)' },
                  { id: 'pickup', icon: '🏪', title: 'Pick up', desc: 'Collect from our Malé studio', price: 'Free', priceColor: 'var(--color-teal)' },
                ].map(opt => (
                  <div key={opt.id} onClick={() => setDeliveryMethod(opt.id as any)}
                    style={{
                      border: deliveryMethod === opt.id ? '2px solid var(--color-text)' : '0.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)', padding: 14, cursor: 'pointer',
                      background: deliveryMethod === opt.id ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                    }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{opt.icon}</div>
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
                    <input className="form-input" placeholder="e.g. Hulhumalé"
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
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>FinePrint Studio — Malé</p>
                  {[
                    ['Address', 'Confirmed at order approval'],
                    ['Hours', 'Sun – Thu, 9 am – 6 pm'],
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
                    <span>{checkoutData.offerLabel} (−{checkoutData.offerPct}%)</span>
                    <span>− {formatMVR(prices.discountAmount)}</span>
                  </div>
                </>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span>Artwork price</span>
                <span>{formatMVR(checkoutData.artistPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span>{sizeLabel} giclée printing</span>
                <span>{formatMVR(prices.printingFee)}</span>
              </div>
              {deliveryMethod === 'delivery' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>Handling & delivery</span><span>{formatMVR(prices.handlingFee)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1D9E75', marginBottom: 4 }}>
                  <span>Pickup</span><span>Free</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500, borderTop: '0.5px solid var(--color-border)', marginTop: 8, paddingTop: 10 }}>
                <span>Total to transfer</span>
                <span>{formatMVR(prices.totalPaid)}</span>
              </div>
            </div>

            {/* Bank transfer */}
            <div className="card">
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Bank transfer</p>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px', marginBottom: 14 }}>
                {[
                  ['Bank', 'Bank of Maldives (BML)'],
                  ['Account name', 'Hasan Shazil'],
                  ['Account number', '7703230358101'],
                  ['Amount', formatMVR(prices.totalPaid)],
                ].map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{k}</p>
                    <p style={{ fontSize: k === 'Amount' ? 18 : 14, fontWeight: 500, fontFamily: k === 'Account number' ? 'var(--font-mono)' : 'inherit' }}>{v}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Transfer the exact amount shown, then upload your slip.
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
                <img src={slipPreview} alt=""
                  style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 10, pointerEvents: 'none' }} />
              )}
              <button className="btn btn-primary btn-full" style={{ marginTop: 16 }}
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit order'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
                By submitting you agree to our{' '}
                <Link href="/terms" style={{ color: 'var(--color-teal)' }}>Terms & Conditions</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
