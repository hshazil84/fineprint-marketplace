'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/app/components/Header'
import { formatMVR } from '@/lib/pricing'

// ── Animated SVG checkmark ────────────────────────────────────────────────
function AnimatedCheck() {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 100)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      <style>{`
        .check-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: ${drawn ? 0 : 166};
          transition: stroke-dashoffset 0.6s cubic-bezier(0.65,0,0.45,1);
        }
        .check-tick {
          stroke-dasharray: 48;
          stroke-dashoffset: ${drawn ? 0 : 48};
          transition: stroke-dashoffset 0.4s cubic-bezier(0.65,0,0.45,1) 0.5s;
        }
        .check-wrap {
          animation: check-pop 0.4s cubic-bezier(0.34,1.45,0.64,1) 0.1s both;
        }
        @keyframes check-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
      <div className="check-wrap" style={{ margin: '0 auto 24px', width: 72, height: 72 }}>
        <svg width="72" height="72" viewBox="0 0 52 52">
          <circle
            className="check-circle"
            cx="26" cy="26" r="25"
            fill="none"
            stroke="#5DCAA5"
            strokeWidth="2"
          />
          <path
            className="check-tick"
            fill="none"
            stroke="#1D9E75"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27 l8 8 l16 -16"
          />
        </svg>
      </div>
    </>
  )
}

// ── Typewriter text ───────────────────────────────────────────────────────
function Typewriter({ text, delay = 0, speed = 45 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  useEffect(() => {
    if (!started) return
    if (displayed.length >= text.length) return
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1))
    }, speed)
    return () => clearTimeout(t)
  }, [started, displayed, text, speed])

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span style={{ opacity: 0.4, animation: 'blink 0.8s step-end infinite' }}>|</span>
      )}
    </span>
  )
}

// ── Zigzag SVG edge ───────────────────────────────────────────────────────
function ZigzagEdge({ flip = false }: { flip?: boolean }) {
  const w    = 400
  const h    = 12
  const size = 10
  const points: string[] = []
  let x = 0
  let top = true
  points.push(`0,${flip ? 0 : h}`)
  while (x <= w) {
    points.push(`${x},${top ? (flip ? h : 0) : (flip ? 0 : h)}`)
    x += size / 2
    top = !top
  }
  points.push(`${w},${flip ? 0 : h}`)
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}
    >
      <polygon points={points.join(' ')} fill="#f5f0e8" />
    </svg>
  )
}

// ── Receipt ───────────────────────────────────────────────────────────────
function Receipt({ data }: { data: any }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 700)
    return () => clearTimeout(t)
  }, [])

  const total = data.items?.reduce((s: number, i: any) => s + i.price, 0) || data.totalPaid || 0

  return (
    <>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes receipt-in {
          0%   { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes receipt-print {
          0%   { clip-path: inset(0 0 100% 0); }
          100% { clip-path: inset(0 0 0% 0); }
        }
        .receipt-wrap {
          animation: receipt-in 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.6s both;
        }
        .receipt-body {
          animation: receipt-print 1.2s ease-out 1s both;
        }
        .receipt-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #d4cfc6;
          display: inline-block;
          margin: 0 2px;
        }
      `}</style>

      <div className="receipt-wrap" style={{ maxWidth: 340, margin: '0 auto 32px' }}>
        {/* Top zigzag */}
        <div style={{ background: '#f5f0e8' }}>
          <ZigzagEdge />
        </div>

        {/* Receipt body */}
        <div
          className="receipt-body"
          style={{
            background:  '#f5f0e8',
            padding:     '4px 28px 16px',
            fontFamily:  '"Courier New", Courier, monospace',
            fontSize:    12,
            color:       '#2a2520',
            lineHeight:  1.8,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 2 }}>FINEPRINT STUDIO</p>
            <p style={{ fontSize: 10, color: '#7a7068', letterSpacing: '0.06em' }}>H. DHUNBURIMAAGE, JANAVAREE MAGU</p>
            <p style={{ fontSize: 10, color: '#7a7068', letterSpacing: '0.06em' }}>MALE, MALDIVES</p>
            <p style={{ fontSize: 10, color: '#7a7068', marginTop: 2 }}>hello@fineprintmv.com</p>
          </div>

          <div style={{ borderTop: '1px dashed #c4bfb6', marginBottom: 10 }} />

          {/* Date + invoice */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a7068', marginBottom: 6 }}>
            <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: '#7a7068' }}>INVOICE NO.</p>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em' }}>
              <Typewriter text={data.invoiceNumber || ''} delay={1200} speed={55} />
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: '#7a7068' }}>ORDER REF.</p>
            <p style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              <Typewriter text={data.orderSku || ''} delay={1800} speed={40} />
            </p>
          </div>

          <div style={{ borderTop: '1px dashed #c4bfb6', margin: '10px 0' }} />

          {/* Items */}
          <div style={{ marginBottom: 10 }}>
            {data.items?.map((item: any, i: number) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>{item.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{formatMVR(item.price)}</span>
                </div>
                <p style={{ fontSize: 10, color: '#7a7068' }}>
                  {item.artistName} · {item.printSize}
                  {item.quantity > 1 ? ' · ×' + item.quantity : ''}
                </p>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed #c4bfb6', margin: '10px 0' }} />

          {/* Delivery */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>{data.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}</span>
            <span>{data.deliveryMethod === 'pickup' ? 'FREE' : 'MVR 100'}</span>
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #c4bfb6' }}>
            <span>TOTAL</span>
            <span>{formatMVR(data.totalPaid || total)}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 14, marginBottom: 6 }}>
            <span className="receipt-dot" />
            <span className="receipt-dot" />
            <span className="receipt-dot" />
          </div>

          {/* Payment method */}
          <div style={{ textAlign: 'center', fontSize: 10, color: '#7a7068', marginBottom: 8 }}>
            <p>{data.paymentMethod === 'swipe' ? 'PAID VIA SWIPE' : 'BANK TRANSFER — BML'}</p>
            <p style={{ marginTop: 2 }}>PENDING VERIFICATION</p>
          </div>

          <div style={{ borderTop: '1px dashed #c4bfb6', margin: '10px 0' }} />

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 10, color: '#7a7068', lineHeight: 1.8 }}>
            <p>GICLÉE ARCHIVAL PRINTS</p>
            <p>HAHNEMÜHLE PAPERS</p>
            <p style={{ marginTop: 6 }}>THANK YOU FOR YOUR ORDER!</p>
            <p>fineprintmv.com</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span className="receipt-dot" />
            <span className="receipt-dot" />
            <span className="receipt-dot" />
          </div>
        </div>

        {/* Bottom zigzag */}
        <div style={{ background: '#f5f0e8' }}>
          <ZigzagEdge flip />
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function OrderConfirmedPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const raw = localStorage.getItem('fp_confirmed')
    if (raw) setData(JSON.parse(raw))
  }, [])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <Header />
      <div style={{ textAlign: 'center', padding: '60px 24px 80px' }}>

        <AnimatedCheck />

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>
          Order submitted!
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 380, margin: '0 auto 32px', lineHeight: 1.7 }}>
          {data?.deliveryMethod === 'pickup'
            ? 'Your print(s) will be ready for pickup at FinePrint Studio, Malé.'
            : 'Your print(s) will be delivered to your address.'}
          {' '}We'll email you once your payment is verified.
        </p>

        {data && <Receipt data={data} />}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Link href="/storefront" className="btn btn-primary">Continue browsing</Link>
          <Link href="/orders/track" className="btn btn-sm">Track your order</Link>
        </div>

      </div>
    </div>
  )
}
