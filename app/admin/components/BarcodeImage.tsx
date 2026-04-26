'use client'
import { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'

interface Props {
  value: string
  width?: number
}

export function BarcodeImage({ value, width = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    try {
      // Try EAN13 first (standard Hahnemühle barcode format)
      bwipjs.toCanvas(canvasRef.current, {
        bcid:            'ean13',
        text:            value,
        scale:           2,
        height:          10,
        includetext:     true,
        backgroundcolor: 'ffffff',
      })
    } catch {
      // Fallback to code128 for non-EAN13 values
      try {
        bwipjs.toCanvas(canvasRef.current!, {
          bcid:            'code128',
          text:            value,
          scale:           2,
          height:          10,
          includetext:     true,
          backgroundcolor: 'ffffff',
        })
      } catch (e) {
        console.error('Barcode render failed:', e)
      }
    }
  }, [value])

  if (!value) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height: 'auto',
        display: 'block',
        borderRadius: 4,
        background: '#fff',
        padding: '4px 6px',
        border: '0.5px solid var(--color-border)',
      }}
    />
  )
}
