'use client'
import { useEffect, useRef } from 'react'
import { PaperOption } from '@/lib/usePapers'
import { formatMVR } from '@/lib/pricing'
import { BarcodeImage } from '@/app/admin/components/BarcodeImage'

const STOCK_SIZE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: '',            color: '#0F6E56', bg: '#E1F5EE' },
  low_stock:    { label: '· Low stock', color: '#633806', bg: '#FAEEDA' },
  backorder:    { label: '· Backorder', color: '#185FA5', bg: '#E6F1FB' },
  out_of_stock: { label: '· Out of stock', color: '#A32D2D', bg: '#FCEBEB' },
}

interface Props {
  paper: PaperOption & {
    stock_qty_a4:    number
    stock_qty_a3:    number
    stock_qty_a2:    number
    stock_low_threshold: number
    barcode:         string | null
    weight_gsm:      number | null
  }
  onClose: () => void
}

function getSizeStatus(qty: number, threshold: number): string {
  if (qty === 0) return 'out_of_stock'
  if (qty <= threshold) return 'low_stock'
  return 'in_stock'
}

export function PaperDetailModal({ paper, onClose }: Props) {
  const [activeImage, setActiveImage] = (typeof window !== 'undefined')
    ? [0, () => {}]
    : [0, () => {}]

  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const sizes = [
    { label: 'A4', qty: paper.stock_qty_a4 },
    { label: 'A3', qty: paper.stock_qty_a3 },
    { label: 'A2', qty: paper.stock_qty_a2 },
  ]

  const addOns = [
    { label: 'A4', value: paper.addOn['A4'] || 0 },
    { label: 'A3', value: paper.addOn['A3'] || 0 },
    { label: 'A2', value: paper.addOn['A2'] || 0 },
  ]

  const hasPremium = addOns.some(a => a.value > 0)
  const images     = paper.images || []

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', overflow: 'hidden' }}>

        {/* Image carousel */}
        <div style={{ position: 'relative', height: 200, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
          {images.length > 0 ? (
            <>
              <img
                src={images[0]}
                alt={paper.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {images.length > 1 && (
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {images.map((_, i) => (
                    <div
                      key={i}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No images yet
            </div>
          )}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>

          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{paper.name}</p>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                background: hasPremium ? '#2C2C2A' : '#D3D1C7',
                color: hasPremium ? '#F1EFE8' : '#444441',
              }}>
                {hasPremium ? 'Premium' : 'Standard'}
              </span>
            </div>
            {paper.weight_gsm && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {paper.weight_gsm} gsm
              </p>
            )}
          </div>

          {/* Description */}
          {paper.description && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              {paper.description}
            </p>
          )}

          {/* Available sizes + stock */}
          <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 12, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Available sizes
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sizes.map(({ label, qty }) => {
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
                <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                    {value > 0 ? '+' + formatMVR(value).replace('MVR ', '') : 'Free'}
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
