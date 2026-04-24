import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const alt         = 'FinePrint Studio artwork'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: { id: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let title      = 'FinePrint Studio'
  let artistName = ''
  let price      = ''
  let imageUrl   = ''
  let sku        = ''

  try {
    const res = await fetch(
      url + '/rest/v1/artworks?id=eq.' + params.id + '&select=title,price,preview_url,sku,profiles:artist_id(full_name,display_name)&limit=1',
      {
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key },
        cache: 'no-store',
      }
    )
    const rows    = await res.json()
    const artwork = rows?.[0]
    if (artwork) {
      title      = artwork.title || title
      artistName = artwork.profiles?.display_name || artwork.profiles?.full_name || ''
      imageUrl   = artwork.preview_url || ''
      sku        = artwork.sku || ''
      price      = artwork.price ? 'From MVR ' + (artwork.price + 200).toLocaleString() : ''
    }
  } catch {}

  // Resize via Supabase image render endpoint
  const resizedImageUrl = imageUrl
    ? imageUrl.replace('/object/public/', '/render/image/public/') + '?width=630&height=630&resize=cover&quality=80'
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex',
          background: '#faf9f6',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {/* Left — artwork image */}
        <div style={{ width: 630, height: 630, flexShrink: 0, overflow: 'hidden', display: 'flex', background: '#e8e6e0' }}>
          {resizedImageUrl || imageUrl ? (
            <img
              src={resizedImageUrl || imageUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 64, color: '#ccc' }}>🖼</span>
            </div>
          )}
        </div>

        {/* Right — details */}
        <div style={{ flex: 1, padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: '#2C2C2A', letterSpacing: '-0.03em' }}>fineprint</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#2C2C2A', letterSpacing: '-0.03em' }}>studio</span>
          </div>

          {/* Title + artist + price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 34, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2, margin: 0, letterSpacing: '-0.02em' }}>
              {title.length > 38 ? title.slice(0, 38) + '…' : title}
            </p>
            {artistName ? (
              <p style={{ fontSize: 17, color: '#777', margin: 0 }}>by {artistName}</p>
            ) : null}
            {sku ? (
              <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>{sku}</p>
            ) : null}
            {price ? (
              <div style={{ display: 'flex', marginTop: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', background: '#f0f0ec', padding: '6px 16px', borderRadius: 8 }}>
                  {price}
                </span>
              </div>
            ) : null}
          </div>

          {/* Bottom — rainbow bar + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              width: 120, height: 4, borderRadius: 2,
              background: 'linear-gradient(to right, #00adee, #fff100, #f05a28, #be1e2d)',
            }} />
            <p style={{ fontSize: 12, color: '#aaa', margin: 0, lineHeight: 1.5 }}>
              Giclée prints on Hahnemühle archival paper
            </p>
            <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>fineprintmv.com</p>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
