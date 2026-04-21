'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/app/components/Header'
import { formatMVR } from '@/lib/pricing'

export default function OrderConfirmedPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const raw = localStorage.getItem('fp_confirmed')
    if (raw) setData(JSON.parse(raw))
  }, [])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>
          ✓
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>Order submitted!</h1>

        {data && (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {data.deliveryMethod === 'pickup'
                ? 'Your print(s) will be ready for pickup at FinePrint Studio, Male.'
                : 'Your print(s) will be delivered to your address.'}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Total paid: {data.totalPaid ? formatMVR(data.totalPaid) : ''}
            </p>

            {/* Order reference */}
            <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 20px', display: 'inline-block', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Order reference</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>
                {data.invoiceNumber}
              </p>
            </div>

            {/* Item list */}
            {data.items && data.items.length > 0 && (
              <div style={{ maxWidth: 400, margin: '0 auto 28px', textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, textAlign: 'center' }}>
                  {data.items.length} item{data.items.length !== 1 ? 's' : ''} ordered
                </p>
                {data.items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                    {item.previewUrl && (
                      <img src={item.previewUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>by {item.artistName} · {item.printSize}</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{formatMVR(item.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Your order is pending payment verification. We will email you once your transfer slip is reviewed and your print is being prepared.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Link href="/storefront" className="btn btn-primary">Continue browsing</Link>
          <Link href="/orders/track" className="btn btn-sm">Track your order</Link>
        </div>
      </div>
    </div>
  )
}
