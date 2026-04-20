'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { renderProtectedImage, attachGlobalKeyboardProtection } from '@/lib/imageProtection'
import Link from 'next/link'
import Footer from '../components/Footer'

interface Artwork {
  id: number
  sku: string
  title: string
  description: string
  price: number
  preview_url: string
  sizes: string[]
  offer_label: string | null
  offer_pct: number | null
  profiles: { full_name: string; artist_code: string; location: string }
}

export default function StorefrontPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    attachGlobalKeyboardProtection()
    fetchArtworks()
  }, [])

  async function fetchArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('*, profiles:artist_id(full_name, artist_code, location)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    setArtworks(data || [])
    setLoading(false)
  }

  return (
    <div>
      <nav className="nav">
        <Link href="/" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <Link href="/orders/track" style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none' }}>Track order</Link>
          <Link href="/auth/login" className="btn">Log in</Link>
          <Link href="/auth/signup" className="btn btn-primary">Sign up</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 8 }}>
            Browse Prints
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
            Original artwork by Maldivian artists — printed and fulfilled by FinePrint Studio
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--color-text-hint)', padding: '60px 0', textAlign: 'center' }}>
            Loading artworks...
          </div>
        ) : artworks.length === 0 ? (
          <div style={{ color: 'var(--color-text-hint)', padding: '60px 0', textAlign: 'center' }}>
            No artworks available yet. Check back soon!
          </div>
        ) : (
          <div className="grid-3">
            {artworks.map(artwork => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prices = { printPrice: artwork.offer_pct ? Math.round(artwork.price * (1 - artwork.offer_pct / 100)) : artwork.price }

  useEffect(() => {
    if (canvasRef.current && artwork.preview_url) {
      renderProtectedImage(canvasRef.current, artwork.preview_url, artwork.profiles.full_name, 400, 400)
    }
  }, [artwork.preview_url])

  return (
    <Link href={`/artwork/${artwork.id}`} style={{ textDecoration: 'none' }}>
      <div className="artwork-card">
        <div className="artwork-protected" style={{ height: 220, background: 'var(--color-background-secondary)' }}>
          {artwork.preview_url ? (
            <img
              src={artwork.preview_url}
              alt={artwork.title}
              style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-hint)', fontSize: 13 }}>
              No preview
            </div>
          )}
          <div className="protect-overlay" />
          {artwork.offer_pct ? (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'var(--color-red)', color: '#fff',
              fontSize: 11, fontWeight: 500, padding: '3px 8px',
              borderRadius: 20, zIndex: 20, pointerEvents: 'none'
            }}>
              {artwork.offer_pct}% off
            </div>
          ) : null}
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{artwork.title}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            by {artwork.profiles.full_name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {artwork.offer_pct ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--color-text-hint)', textDecoration: 'line-through' }}>
                  {formatMVR(artwork.price)}
                </span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>
                  {formatMVR(prices.printPrice)}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(artwork.price)}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="sku-tag">{artwork.sku}</span>
            {artwork.offer_label && (
              <span className="offer-tag">{artwork.offer_label}</span>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </Link>
  )
}
