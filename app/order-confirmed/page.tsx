'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OrderConfirmedPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const raw = localStorage.getItem('fp_confirmed')
    if (raw) setData(JSON.parse(raw))
  }, [])

  return (
    <div>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
      </nav>
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>
          ✓
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>Order submitted!</h1>

        {data && (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {data.deliveryMethod === 'pickup'
                ? 'Your print will be ready for pickup at FinePrint Studio, Malé.'
                : 'Your print will be delivered to your address.'}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Total paid: {data.totalPaid ? `MVR ${data.totalPaid}` : ''}
            </p>
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 20px', display: 'inline-block', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Order reference</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>
                {data.invoiceNumber} · {data.orderSku}
              </p>
            </div>
          </>
        )}

        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Your order is pending payment verification. We'll email you once your transfer slip is reviewed and your print is being prepared.
        </p>
        <Link href="/storefront" className="btn btn-primary">Continue browsing</Link>
        <Link href="/orders/track" className="btn btn-sm" style={{ marginTop: 12, display: 'inline-block' }}>
  Track your order →
</Link>
      </div>
    </div>
  )
}
