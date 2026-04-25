'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const STEPS = 5

const TITLES = [
  'You are exactly who\nwe built this for, [name] ♡',
  'Museum-quality\nprints, handled.',
  'You keep 95%\nof every sale.',
  'Everything\nin one place.',
  'Your art\nstarts here.',
]

const EM_WORDS: Record<number, string[]> = {
  1: ['handled.'],
  2: ['95%'],
  3: ['one'],
  4: ['here.'],
}

function buildWords(step: number, name: string) {
  const raw = TITLES[step].replace('[name]', name.split(' ')[0])
  return raw.split('\n').map(line => line.split(' '))
}

function WordTitle({
  step, name, animKey,
}: { step: number; name: string; animKey: number }) {
  const [visible, setVisible] = useState<boolean[]>([])
  const em = EM_WORDS[step] || []
  const lines = buildWords(step, name)
  const flat  = lines.flat()

  useEffect(() => {
    setVisible([])
    flat.forEach((_, i) => {
      setTimeout(() => setVisible(v => { const n = [...v]; n[i] = true; return n }), 120 + i * 52)
    })
  }, [animKey])

  let idx = 0
  return (
    <h1 style={{
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontSize: step === 0 || step === 4 ? 36 : 30,
      lineHeight: 1.1, margin: '0 0 16px', color: '#1a1a18',
    }}>
      {lines.map((words, li) => (
        <span key={li} style={{ display: 'block' }}>
          {words.map((w, wi) => {
            const i = idx++
            const isEm = em.includes(w)
            return (
              <span key={wi}>
                <span style={{
                  display:    'inline-block',
                  opacity:    visible[i] ? 1 : 0,
                  filter:     visible[i] ? 'blur(0)' : 'blur(6px)',
                  transform:  visible[i] ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.5s cubic-bezier(0.2,0,0,1)',
                  color:      isEm ? '#1D9E75' : 'inherit',
                  fontStyle:  isEm ? 'italic' : 'normal',
                }}>
                  {w}
                </span>
                {wi < words.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const bands = [
      { y:.18, amp:.14, freq:.55, speed:.28, h:165, s:55, l:72, a:.45, th:.20 },
      { y:.35, amp:.10, freq:.80, speed:.40, h:195, s:60, l:75, a:.35, th:.15 },
      { y:.50, amp:.12, freq:.65, speed:.22, h:145, s:50, l:70, a:.30, th:.13 },
      { y:.65, amp:.08, freq:1.0, speed:.35, h:175, s:55, l:74, a:.22, th:.10 },
      { y:.25, amp:.09, freq:.90, speed:.18, h:210, s:50, l:78, a:.28, th:.11 },
    ]
    let t = 0, raf = 0

    function resize() {
      canvas!.width  = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const W = canvas!.width, H = canvas!.height
      ctx.clearRect(0, 0, W, H)
      bands.forEach(b => {
        const cy = b.y * H, pts: {x:number;y:number}[] = []
        for (let i = 0; i <= 80; i++) {
          const x = i / 80 * W
          pts.push({ x, y: cy
            + Math.sin(i*b.freq*.08 + t*b.speed)*b.amp*H
            + Math.sin(i*b.freq*.14 + t*b.speed*.7+1.2)*b.amp*.5*H
            + Math.cos(i*b.freq*.05 + t*b.speed*1.3+2.4)*b.amp*.3*H
          })
        }
        const th = b.th * H
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y - th)
        pts.forEach(p => ctx.lineTo(p.x, p.y - th))
        for (let i = pts.length-1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + th)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, cy-th, 0, cy+th)
        g.addColorStop(0,    `hsla(${b.h},${b.s}%,${b.l}%,0)`)
        g.addColorStop(.35,  `hsla(${b.h},${b.s}%,${b.l}%,${b.a})`)
        g.addColorStop(.5,   `hsla(${b.h+15},${b.s}%,${b.l+5}%,${b.a*1.2})`)
        g.addColorStop(.65,  `hsla(${b.h},${b.s}%,${b.l}%,${b.a})`)
        g.addColorStop(1,    `hsla(${b.h},${b.s}%,${b.l}%,0)`)
        ctx.fillStyle = g
        ctx.fill()
      })
      t += 0.010
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: '50%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%',
        background: 'linear-gradient(to bottom, transparent, var(--color-background-primary, #f9f8f5))',
      }} />
    </div>
  )
}

function HeartIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ display: 'block' }}>
      <circle cx="32" cy="32" r="30" fill="#fff0f3" stroke="#ffc0cc" strokeWidth="1" />
      <path
        d="M32 45 C32 45 14 34 14 23 C14 17 18.5 13 23.5 13 C27 13 30 15 32 18 C34 15 37 13 40.5 13 C45.5 13 50 17 50 23 C50 34 32 45 32 45Z"
        fill="#ff6b8a"
        style={{
          transformOrigin: '50% 55%',
          animation: 'fp-heartbeat 1.6s ease-in-out infinite',
        }}
      />
    </svg>
  )
}

function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<any[]>([])
  const cols = ['#ff6b8a','#5DCAA5','#00adee','#1D9E75','#f05a28','#FFB74D','#4fc3f7']
  useEffect(() => {
    if (!active) return
    setPieces(Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      bg: cols[Math.floor(Math.random() * cols.length)],
      dur: 1.5 + Math.random() * 2,
      delay: Math.random() * 0.8,
      w: 4 + Math.random() * 6,
      h: 4 + Math.random() * 6,
    })))
  }, [active])

  if (!pieces.length) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left + '%', top: -8,
          width: p.w, height: p.h,
          background: p.bg,
          borderRadius: 1,
          animation: `fp-conf-fall ${p.dur}s linear ${p.delay}s both`,
        }} />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router    = useRouter()
  const supabase  = createClient()
  const [profile, setProfile]   = useState<any>(null)
  const [step, setStep]         = useState(0)
  const [animKey, setAnimKey]   = useState(0)
  const [sliding, setSliding]   = useState(false)
  const [direction, setDirection] = useState<1|-1>(1)
  const [loading, setLoading]   = useState(true)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'artist') { router.push('/storefront'); return }
      if (prof.onboarding_complete) { router.push('/artist/dashboard'); return }
      setProfile(prof)
      setLoading(false)
    }
    init()
  }, [])

  async function complete() {
    setFinishing(true)
    if (profile) {
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', profile.id)
    }
    router.push('/artist/dashboard')
  }

  function goTo(next: number) {
    if (sliding) return
    if (next >= STEPS) { complete(); return }
    setDirection(next > step ? 1 : -1)
    setSliding(true)
    setTimeout(() => {
      setStep(next)
      setAnimKey(k => k + 1)
      setSliding(false)
    }, 480)
  }

  function next() { goTo(step + 1) }
  function prev() { goTo(step - 1) }
  function skip() { goTo(STEPS) }

  const name      = profile?.display_name || profile?.full_name || 'Artist'
  const firstName = name.split(' ')[0]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-primary)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #5DCAA5', borderTopColor: 'transparent', animation: 'fp-spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fp-heartbeat { 0%,100%{transform:scale(1)} 15%{transform:scale(1.18)} 30%{transform:scale(1)} 45%{transform:scale(1.1)} 60%{transform:scale(1)} }
        @keyframes fp-conf-fall  { 0%{opacity:1;transform:translateY(-10px) rotate(0deg)} 100%{opacity:0;transform:translateY(110vh) rotate(720deg)} }
        @keyframes fp-spin       { to{transform:rotate(360deg)} }
        @keyframes fp-slide-in-right  { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fp-slide-in-left   { from{transform:translateX(-60px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fp-slide-out-left  { from{transform:translateX(0);opacity:1} to{transform:translateX(-60px);opacity:0} }
        @keyframes fp-slide-out-right { from{transform:translateX(0);opacity:1} to{transform:translateX(60px);opacity:0} }
        @keyframes fp-heart-pop  { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes fp-pulse-dot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--color-background-primary, #f9f8f5)',
        borderRadius: 20,
        border: '0.5px solid var(--color-border, #e8e5dc)',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 600,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>

        <AuroraCanvas />
        <Confetti active={step === 4} />

        {/* Dot nav */}
        <div style={{ display: 'flex', gap: 6, padding: '28px 36px 0', position: 'relative', zIndex: 1 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                height: 6, borderRadius: 3, cursor: 'pointer',
                background: i === step ? '#1a1a18' : 'rgba(26,26,24,0.12)',
                width: i === step ? 20 : 6,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Slide content */}
        <div style={{
          flex: 1, padding: '20px 36px 28px',
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          animation: sliding
            ? `${direction === 1 ? 'fp-slide-out-left' : 'fp-slide-out-right'} 0.4s ease both`
            : `${direction === 1 ? 'fp-slide-in-right' : 'fp-slide-in-left'} 0.4s ease both`,
        }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* ── STEP 0: Welcome ── */}
            {step === 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9890', marginBottom: 14, fontFamily: '"DM Sans", sans-serif' }}>
                  FinePrint Studio — Artist welcome
                </p>
                <WordTitle step={0} name={firstName} animKey={animKey} />
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#6b6a66', marginBottom: 20, fontFamily: '"DM Sans", sans-serif', maxWidth: 400 }}>
                  It means the world to us that you chose FinePrint Studio. Your creativity, your vision, your art — proud to have you onboard.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: 10, padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 10, color: '#aaa89f', letterSpacing: '0.08em', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>YOUR NAME</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', fontFamily: '"DM Sans", sans-serif' }}>{name}</p>
                  </div>
                  <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: 10, padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 10, color: '#aaa89f', letterSpacing: '0.08em', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>ARTIST CODE</p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#888', fontFamily: 'monospace', letterSpacing: '0.06em' }}>FP-{profile?.artist_code}</p>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 1: Prints ── */}
            {step === 1 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9890', marginBottom: 14, fontFamily: '"DM Sans", sans-serif' }}>Step 1 of 3 — Your prints</p>
                <WordTitle step={1} name={firstName} animKey={animKey} />
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#6b6a66', marginBottom: 20, fontFamily: '"DM Sans", sans-serif' }}>
                  Every print is on Hahnemühle archival paper. We handle production, packaging and shipping — you just upload.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { icon: '🖨', title: 'Giclée printing',  body: 'Archival inks, Hahnemühle papers' },
                    { icon: '📦', title: 'We ship it',       body: 'Mailers + tubes, all Maldives' },
                    { icon: '🔒', title: 'Art protected',    body: 'Watermarked previews only' },
                    { icon: '📐', title: 'A4 · A3 · A2',    body: 'You choose which sizes to offer' },
                  ].map(c => (
                    <div key={c.title} style={{ background: '#fff', border: '0.5px solid #e8e5dc', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <span style={{ fontSize: 20, marginBottom: 8, display: 'block' }}>{c.icon}</span>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 3, fontFamily: '"DM Sans", sans-serif' }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: '#9a9890', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>{c.body}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── STEP 2: Getting paid ── */}
            {step === 2 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9890', marginBottom: 14, fontFamily: '"DM Sans", sans-serif' }}>Step 2 of 3 — Getting paid</p>
                <WordTitle step={2} name={firstName} animKey={animKey} />
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#6b6a66', marginBottom: 20, fontFamily: '"DM Sans", sans-serif' }}>
                  FinePrint takes a small 5% platform fee. The rest goes straight to you.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {/* 95% tile */}
                  <div style={{ background: '#f0faf5', border: '0.5px solid #b8e8d4', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 44, color: '#1D9E75', lineHeight: 1 }}>95%</p>
                    <p style={{ fontSize: 10, color: '#5DCAA5', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6, fontFamily: '"DM Sans", sans-serif' }}>Your earnings</p>
                  </div>
                  {/* Steps tile */}
                  <div style={{ background: '#fff', border: '0.5px solid #e8e5dc', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    {['Order approved — earnings credited', 'Request payout from dashboard', 'Payout in your account'].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8f8f2', color: '#0F6E56', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                        <span style={{ fontSize: 11, color: '#4a4a48', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  {/* Payout tile — full width blue */}
                  <div style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg,#e8f4fd,#dff0f8)', border: '0.5px solid #a8d5ef', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#e3f2fd', border: '0.5px solid #90caf9', borderRadius: 20, padding: '3px 10px', marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1976D2', animation: 'fp-pulse-dot 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#1565C0', letterSpacing: '0.04em', fontFamily: '"DM Sans", sans-serif' }}>FAST PAYOUT</span>
                      </div>
                      <p style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 24, color: '#1565C0', lineHeight: 1.1, marginBottom: 4 }}>Within 24 hours</p>
                      <p style={{ fontSize: 11, color: '#1976D2', fontFamily: '"DM Sans", sans-serif' }}>Receive your payouts within 24hrs of approval</p>
                    </div>
                    <span style={{ fontSize: 32, opacity: 0.6 }}>⚡</span>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 3: Features ── */}
            {step === 3 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9890', marginBottom: 14, fontFamily: '"DM Sans", sans-serif' }}>Step 3 of 3 — Your tools</p>
                <WordTitle step={3} name={firstName} animKey={animKey} />
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#6b6a66', marginBottom: 20, fontFamily: '"DM Sans", sans-serif' }}>
                  Everything you need to run your art business — from your artist dashboard.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 8 }}>
                  {/* Tall — public page */}
                  <div style={{ gridRow: 'span 2', background: 'linear-gradient(160deg,#e8f8f2,#f0faf5)', border: '0.5px solid #b8e8d4', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 22, marginBottom: 8, display: 'block' }}>🌐</span>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0F6E56', marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>Public artist page</p>
                    <p style={{ fontSize: 10, color: '#5DCAA5', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>Share your link on Instagram</p>
                  </div>
                  <div style={{ background: '#fff', border: '0.5px solid #e8e5dc', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 18, marginBottom: 8, display: 'block' }}>🏪</span>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>Open / close shop</p>
                    <p style={{ fontSize: 10, color: '#9a9890', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>Pause listings anytime</p>
                  </div>
                  <div style={{ background: '#fff', border: '0.5px solid #e8e5dc', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#FFF3E0', border: '0.5px solid #FFB74D', borderRadius: 20, padding: '3px 8px', fontSize: 9, fontWeight: 500, color: '#E65100', marginBottom: 6, letterSpacing: '0.04em', fontFamily: '"DM Sans", sans-serif' }}>% OFF</div>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>Run promotions</p>
                    <p style={{ fontSize: 10, color: '#9a9890', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>Set discounts per artwork</p>
                  </div>
                  {/* Wide bottom */}
                  <div style={{ gridColumn: 'span 2', background: '#fff', border: '0.5px solid #e8e5dc', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 18, marginBottom: 6, display: 'block' }}>📤</span>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>Upload once, sell forever</p>
                    <p style={{ fontSize: 10, color: '#9a9890', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>Hi-res stored privately · watermarked preview shown to buyers · you set the price</p>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 4: Done ── */}
            {step === 4 && (
              <>
                <div style={{
                  width: 64, height: 64, marginBottom: 20,
                  animation: 'fp-heart-pop 0.5s cubic-bezier(0.34,1.45,0.64,1) 0.2s both',
                }}>
                  <HeartIcon />
                </div>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9890', marginBottom: 14, fontFamily: '"DM Sans", sans-serif' }}>You're all set</p>
                <WordTitle step={4} name={firstName} animKey={animKey} />
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#6b6a66', fontFamily: '"DM Sans", sans-serif', maxWidth: 400 }}>
                  Your artist profile is live. The Maldives is waiting to discover your work — upload your first artwork and start earning today.
                </p>
              </>
            )}

          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid #e8e5dc', marginTop: 8 }}>
            {step === 0 ? (
              <button onClick={skip} style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#c0bdb5', fontFamily: '"DM Sans", sans-serif' }}>
                Skip intro
              </button>
            ) : step === 4 ? (
              <span />
            ) : (
              <button onClick={prev} style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa89f', fontFamily: '"DM Sans", sans-serif', padding: '8px 0' }}>
                ← Back
              </button>
            )}

            <button
              onClick={step === 0 ? next : step === 4 ? complete : next}
              disabled={finishing}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 100, border: 'none',
                fontSize: 13, fontWeight: 500, fontFamily: '"DM Sans", sans-serif',
                cursor: finishing ? 'default' : 'pointer',
                background: step === 0 || step === 4 ? '#1D9E75' : '#1a1a18',
                color: '#fff', opacity: finishing ? 0.7 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {finishing ? 'Setting up...' : step === 0 ? 'Let\'s begin →' : step === 4 ? 'Go to dashboard →' : step === 3 ? 'Let\'s go →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
