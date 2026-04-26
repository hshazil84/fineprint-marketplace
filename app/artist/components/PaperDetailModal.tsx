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
  const overlayRef                = useRef<HTMLDivElement>(null)
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

  // Always show A4 + A3, show A2 only if has stock or add-on
  const offeredSizes = [
    { label: 'A4', qty: paper.stock_qty_a4 },
    { label: 'A3', qty: paper.stock_qty_a3 },
    { label: 'A2', qty: paper.stock_qty_a2 },
  ].filter(({ label, qty }) => {
    if (label === 'A4' || label === 'A3') return true
    return qty > 0 || (paper.addOn['A2'] || 0) > 0
  })

  const addOns = offeredSizes.map(({ label }) => ({
    label,
    value: paper.addOn[label] || 0,
  }))

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

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Image carousel */}
        <div
          style={{ position: 'relative', height: 200, background: 'var(--color-background-secondary)', flexShrink: 0, overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            <img
              src={images[activeImg]}
              alt={paper.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.2s' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
              No images yet
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 2 }}
          >×</button>

          {/* Prev */}
          {images.length > 1 && activeImg > 0 && (
            <button
              onClick={() => setActiveImg(i => i - 1)}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
            >‹</button>
          )}

          {/* Next */}
          {images.length > 1 && activeImg < images.length - 1 && (
            <button
              onClick={() => setActiveImg(i => i + 1)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
            >›</button>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: i === activeImg ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'background 0.2s' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>

          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{paper.name}</p>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                background: hasPremium ? '#2C2C2A' : '#D3D1C7',
                color:      hasPremium ? '#F1EFE8' : '#444441',
              }}>
                {hasPremium ? 'Premium' : 'Standard'}
              </span>
            </div>
            {paper.weight_gsm && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{paper.weight_gsm} gsm</p>
            )}
          </div>

          {/* Best for tags */}
          {bestFor.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {bestFor.map(key => (
                <span
                  key={key}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}
                >
                  ✓ {BEST_FOR_LABELS[key] || key}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {paper.description && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              {paper.description}
            </p>
          )}

          {/* Available sizes */}
          <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 12, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Available sizes
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {offeredSizes.map(({ label, qty }) => {
                const status = getSizeStatus(qty, paper.stock_low_threshold)
                const config = STOCK_SIZE_CONFIG[status]
                return (
                  <div
                    key={label}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: config.bg, borderRadius: 8, padding: '6px 12px' }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: config.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: config.color }}>
                      {label}{config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Price add-ons */}
          <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 12, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Price add-ons (MVR)
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {addOns.map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: 8, padding: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                    {value > 0 ? '+' + value : 'Free'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Barcode */}
          {paper.barcode && (
            <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EAN</p>
                <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>{paper.barcode}</p>
              </div>
              <BarcodeImage value={paper.barcode} width={120} />
            </div>
          )}

          {/* Datasheet */}
          {paper.datasheet_url && (
            <a
              href={paper.datasheet_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0F6E56', textDecoration: 'none', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '8px 14px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
