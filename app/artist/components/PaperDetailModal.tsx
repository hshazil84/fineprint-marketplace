'use client'
import { useEffect, useRef, useState } from 'react'
import { BarcodeImage } from '@/app/admin/components/BarcodeImage'
import { BEST_FOR_LABELS } from '@/lib/usePapers'

const STOCK_SIZE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: '',                color: '#0F6E56', bg: '#E1F5EE' },
  low_stock:    { label: ' · Low stock',    color: '#633806', bg: '#FAEEDA' },
  backorder:    { label: ' · Backorder',    color: '#185FA5', bg: '#E6F1FB' },
  out_of_stock: { label: ' · Out of stock', color: '#A32D2D', bg: '#FCEBEB' },
}

interface PaperDetailProps {
  paper: {
    name:                string
    category:            string
    description:         string
    addOn:               Record<string, number>
    stock_status:        string
    stock_qty_a4:        number
    stock_qty_a3:        number
    stock_qty_a2:        number
    stock_low_threshold: number
    weight_gsm:          number | null
    barcode:             string | null
    images:              string[]
    datasheet_url:       string | null
    best_for:            string[]
  }
  onClose: () => void
}

function getSizeStatus(qty: number, threshold: number): string {
  if (qty === 0) return 'out_of_stock'
  if (qty <= threshold) return 'low_stock'
  return 'in_stock'
}

export function PaperDetailModal({ paper, onClose }: PaperDetailProps) {
  const [activeImg, setActiveImg] = useState(0)
  const touchStartX               = useRef<number | null>(null)

  const images     = paper.images || []
  const hasPremium = (paper.addOn['A4'] || 0) > 0 || (paper.addOn['A3'] || 0) > 0
  const bestFor    = paper.best_for || []

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowRight') setActiveImg(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')  setActiveImg(i => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, images.length])

  const offeredSizes = [
    { label: 'A4', qty: paper.stock_qty_a4 },
    { label: 'A3', qty: paper.stock_qty_a3 },
    { label: 'A2', qty: paper.stock_qty_a2 },
  ].filter(function(s) {
    if (s.label === 'A4' || s.label === 'A3') return true
    return s.qty > 0 || (paper.addOn['A2'] || 0) > 0
  })

  const addOns = offeredSizes.map(function(s) {
    return { label: s.label, value: paper.addOn[s.label] || 0 }
  })

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50)  setActiveImg(i => Math.min(i + 1, images.length - 1))
    if (diff < -50) setActiveImg(i => Math.max(i - 1, 0))
    touchStartX.current = null
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--color-background-primary)', borderRadius: 20, width: '100%', maxWidth: 400, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>

        {/* Image carousel */}
        <div style={{ position: 'relative', height: 200, background: 'var(--color-background-secondary)', flexShrink: 0, overflow: 'hidden', borderRadius: '20px 20px 0 0' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {images.length > 0 ? (
            <img src={images[activeImg]} alt={paper.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>No images yet</div>
          )}
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>×</button>
          {images.length > 1 && activeImg > 0 && (
            <button onClick={function() { setActiveImg(function(i) { return Math.max(i - 1, 0) }) }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>‹</button>
          )}
          {images.length > 1 && activeImg < images.length - 1 && (
            <button onClick={function() { setActiveImg(function(i) { return Math.min(i + 1, images.length - 1) }) }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>›</button>
          )}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
              {images.map(function(_, i) {
                return <div key={i} onClick={function() { setActiveImg(i) }} style={{ width: 6, height: 6, borderRadius: '50%', background: i === activeImg ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'background 0.2s' }} />
              })}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 600, margin: '0 0 3px', letterSpacing: '-0.2px' }}>{paper.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {paper.weight_gsm && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{paper.weight_gsm} gsm</span>}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: hasPremium ? '#2C2C2A' : '#E8E6E0', color: hasPremium ? '#F1EFE8' : '#666460' }}>
                  {hasPremium ? 'Premium' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '16px 20px 32px', overflowY: 'auto', flex: 1 }}>

          {bestFor.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {bestFor.map(function(key) {
                return (
                  <span key={key} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#EBF3FC', color: '#185FA5', fontWeight: 500 }}>
                    ✓ {BEST_FOR_LABELS[key] || key}
                  </span>
                )
              })}
            </div>
          )}

          {paper.description && (
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 20px' }}>{paper.description}</p>
          )}

          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>Available sizes</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {offeredSizes.map(function(s) {
                const status = getSizeStatus(s.qty, paper.stock_low_threshold)
                const config = STOCK_SIZE_CONFIG[status]
                return (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: config.bg, borderRadius: 8, padding: '6px 14px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: config.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: config.color }}>{s.label}{config.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>Price add-ons (MVR)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {addOns.map(function(a) {
                return (
                  <div key={a.label} style={{ flex: 1, textAlign: 'center', background: 'var(--color-background-primary)', borderRadius: 8, padding: '10px 8px', border: '0.5px solid var(--color-border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 3px' }}>{a.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: a.value > 0 ? '#633806' : '#0F6E56' }}>
                      {a.value > 0 ? '+' + a.value : 'Free'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {paper.barcode && (
            <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>EAN</p>
                <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>{paper.barcode}</p>
              </div>
              <BarcodeImage value={paper.barcode} width={110} />
            </div>
          )}

          {paper.datasheet_url && (
            <a href={paper.datasheet_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#0F6E56', textDecoration: 'none', background: '#E1F5EE', borderRadius: 12, padding: '12px 16px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download datasheet (PDF)
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
