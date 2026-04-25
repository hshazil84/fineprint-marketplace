'use client'
import { useEffect, useState, useRef } from 'react'
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
          <circle className="check-circle" cx="26" cy="26" r="25" fill="none" stroke="#5DCAA5" strokeWidth="2" />
          <path className="check-tick" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27 l8 8 l16 -16" />
        </svg>
      </div>
    </>
  )
}

// ── Typewriter ────────────────────────────────────────────────────────────
function Typewriter({ text, delay = 0, speed = 45 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted]     = useState(false)
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t) }, [delay])
  useEffect(() => {
    if (!started || displayed.length >= text.length) return
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed)
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

// ── Zigzag SVG ────────────────────────────────────────────────────────────
function ZigzagEdge({ flip = false, color = '#f5f0e8' }: { flip?: boolean; color?: string }) {
  const w = 400, h = 14, size = 12
  const pts: string[] = []
  let x = 0, top = true
  pts.push(`0,${flip ? 0 : h}`)
  while (x <= w) {
    pts.push(`${x},${top ? (flip ? h : 0) : (flip ? 0 : h)}`)
    x += size / 2
    top = !top
  }
  pts.push(`${w},${flip ? 0 : h}`)
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polygon points={pts.join(' ')} fill={color} />
    </svg>
  )
}

// ── Printer slot ──────────────────────────────────────────────────────────
function PrinterSlot() {
  return (
    <div style={{
      width: 300,
      margin: '0 auto',
      height: 28,
      background: 'linear-gradient(to bottom, #2a2a2a, #3a3a3a)',
      borderRadius: '10px 10px 4px 4px',
      position: 'relative',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      zIndex: 10,
    }}>
      {/* Slot opening */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 220,
        height: 4,
        background: '#111',
        borderRadius: '0 0 2px 2px',
      }} />
      {/* LED dots */}
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i === 0 ? '#1D9E75' : '#555',
          boxShadow: i === 0 ? '0 0 6px #1D9E75' : 'none',
          marginBottom: 6,
        }} />
      ))}
      <div style={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-60%)',
        width: 28,
        height: 10,
        background: '#222',
        borderRadius: 3,
        border: '0.5px solid #444',
      }} />
    </div>
  )
}

// ── Receipt ───────────────────────────────────────────────────────────────
function Receipt({ data }: { data: any }) {
  const [printing, setPrinting] = useState(false)
  const [done, setDone]         = useState(false)
  const receiptRef              = useRef<HTMLDivElement>(null)
  const [receiptHeight, setReceiptHeight] = useState(0)

  useEffect(() => {
    // Measure receipt height after mount
    if (receiptRef.current) {
      setReceiptHeight(receiptRef.current.scrollHeight)
    }
    const t = setTimeout(() => setPrinting(true), 900)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!printing) return
    // Mark done after animation completes
    const duration = Math.max(2000, receiptHeight * 3.5)
    const t = setTimeout(() => setDone(true), duration)
    return () => clearTimeout(t)
  }, [printing, receiptHeight])

  const duration  = Math.max(2000, receiptHeight * 3.5)
  const total     = data.items?.reduce((s: number, i: any) => s + i.price, 0) || data.totalPaid || 0

  return (
    <>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }

        /* Receipt feeds downward from printer slot */
        @keyframes feed-out {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(0); }
        }

        /* Subtle paper curl shadow grows as it emerges */
        @keyframes shadow-grow {
          0%   { box-shadow: 0 0 0 rgba(0,0,0,0); }
          100% { box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08); }
        }

        .receipt-feed {
          animation:
            feed-out ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1) 0.9s both,
            shadow-grow ${duration}ms ease-out 0.9s both;
        }

        .receipt-done {
          box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
        }

        /* Printer sound lines — horizontal scan lines on the paper */
        @keyframes scan-line {
          0%   { top: 0%; opacity: 0.06; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: rgba(0,0,0,0.12);
          pointer-events: none;
          animation: scan-line ${duration}ms linear 0.9s both;
        }
      `}</style>

      <div style={{ maxWidth: 300, margin: '0 auto 40px', position: 'relative' }}>

        {/* Printer body */}
        <PrinterSlot />

        {/* Clipping container — hides receipt above slot */}
        <div style={{
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '0 0 4px 4px',
        }}>
          {/* The receipt itself feeds downward */}
          <div
            ref={receiptRef}
            className={printing ? (done ? 'receipt-done' : 'receipt-feed') : ''}
            style={{
              transform: printing ? undefined : 'translateY(-100%)',
              position: 'relative',
              borderRadius: '0 0 4px 4px',
              overflow: 'hidden',
            }}
          >
            {/* Scanning line overlay while printing */}
            {printing && !done && <div className="scan-line" />}

            {/* Top tear line */}
            <div style={{
              background: '#f5f0e8',
              padding: '10px 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ flex: 1, borderTop: '1.5px dashed #c4bfb6' }} />
              <span style={{
                fontSize: 8,
                color: '#b0a99e',
                letterSpacing: '0.08em',
                fontFamily: '"Courier New", Courier, monospace',
                flexShrink: 0,
              }}>✂ TEAR HERE</span>
              <div style={{ flex: 1, borderTop: '1.5px dashed #c4bfb6' }} />
            </div>

            {/* Body */}
            <div style={{
              background:  '#f5f0e8',
              padding:     '8px 24px 16px',
              fontFamily:  '"Courier New", Courier, monospace',
              fontSize:    11,
              color:       '#2a2520',
              lineHeight:  1.9,
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 2 }}>FINEPRINT STUDIO</p>
                <p style={{ fontSize: 9, color: '#7a7068', letterSpacing: '0.06em', lineHeight: 1.6 }}>
                  H. DHUNBURIMAAGE, JANAVAREE MAGU<br />
                  MALÉ, MALDIVES<br />
                  hello@fineprintmv.com
                </p>
              </div>

              <div style={{ borderTop: '1px dashed #c4bfb6', margin: '8px 0' }} />

              {/* Date + time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7a7068', marginBottom: 8 }}>
                <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Invoice number */}
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 9, color: '#7a7068', marginBottom: 1 }}>INVOICE NO.</p>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
                  <Typewriter text={data.invoiceNumber || ''} delay={1400} speed={55} />
                </p>
              </div>

              {/* Order SKU */}
              {data.orderSku && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 9, color: '#7a7068', marginBottom: 1 }}>ORDER REF.</p>
                  <p style={{ fontSize: 10, letterSpacing: '0.04em' }}>
                    <Typewriter text={data.orderSku} delay={2000} speed={40} />
                  </p>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #c4bfb6', margin: '8px 0' }} />

              {/* Items */}
              <div style={{ marginBottom: 6 }}>
                {data.items?.map((item: any, i: number) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{item.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{formatMVR(item.price)}</span>
                    </div>
                    <p style={{ fontSize: 9, color: '#7a7068' }}>
                      {item.artistName} · {item.printSize}{item.quantity > 1 ? ' · ×' + item.quantity : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #c4bfb6', margin: '8px 0' }} />

              {/* Delivery */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span>{data.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                <span>{data.deliveryMethod === 'pickup' ? 'FREE' : 'MVR 100'}</span>
              </div>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: '1px solid #c4bfb6', marginTop: 4 }}>
                <span>TOTAL</span>
                <span>{formatMVR(data.totalPaid || total)}</span>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#c4bfb6', margin: '0 3px' }} />
                ))}
              </div>

              {/* Payment */}
              <div style={{ textAlign: 'center', fontSize: 9, color: '#7a7068', lineHeight: 1.8 }}>
                <p>{data.paymentMethod === 'swipe' ? 'PAID VIA SWIPE' : 'BANK TRANSFER — BML'}</p>
                <p>PENDING VERIFICATION</p>
              </div>

              <div style={{ borderTop: '1px dashed #c4bfb6', margin: '8px 0' }} />

              {/* Footer */}
              <div style={{ textAlign: 'center', fontSize: 9, color: '#7a7068', lineHeight: 1.9 }}>
                <p>GICLÉE ARCHIVAL PRINTS</p>
                <p>HAHNEMÜHLE PAPERS</p>
                <p style={{ marginTop: 4, fontWeight: 600 }}>THANK YOU FOR YOUR ORDER!</p>
                <p>fineprintmv.com</p>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#c4bfb6', margin: '0 3px' }} />
                ))}
              </div>
            </div>

            {/* Bottom zigzag */}
            <ZigzagEdge flip color="#f5f0e8" />
          </div>
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
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 380, margin: '0 auto 36px', lineHeight: 1.7 }}>
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
