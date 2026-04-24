import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id  = searchParams.get('id') || ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let title      = 'FinePrint Studio'
  let artistName = ''
  let price      = ''
  let imageUrl   = ''
  let sku        = ''

  try {
    const res = await fetch(
      url + '/rest/v1/artworks?id=eq.' + id + '&select=title,price,preview_url,sku,profiles:artist_id(full_name,display_name)&limit=1',
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

  const resizedImageUrl = imageUrl
    ? imageUrl.replace('/object/public/', '/render/image/public/') + '?width=420&height=420&resize=cover&quality=75'
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
        <div style={{ width: 420, height: 420, flexShrink: 0, overflow: 'hidden', display: 'flex', background: '#e8e6e0' }}>
          {resizedImageUrl || imageUrl ? (
            <img src={resizedImageUrl || imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 48, color: '#ccc' }}>🖼</span>
            </div>
          )}
        </div>

        {/* Right — details */}
        <div style={{ flex: 1, padding: '36px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#2C2C2A', letterSpacing: '-0.03em' }}>fineprint</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#2C2C2A', letterSpacing: '-0.03em' }}>studio</span>
          </div>

          {/* Title + artist + price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 26, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2, margin: 0, letterSpacing: '-0.02em' }}>
              {title.length > 38 ? title.slice(0, 38) + '…' : title}
            </p>
            {artistName ? <p style={{ fontSize: 14, color: '#777', margin: 0 }}>by {artistName}</p> : null}
            {sku ? <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>{sku}</p> : null}
            {price ? (
              <div style={{ display: 'flex', marginTop: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', background: '#f0f0ec', padding: '5px 14px', borderRadius: 8 }}>
                  {price}
                </span>
              </div>
            ) : null}
          </div>

          {/* Bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 100, height: 3, borderRadius: 2, background: 'linear-gradient(to right, #00adee, #fff100, #f05a28, #be1e2d)' }} />
            <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Giclée prints on Hahnemühle archival paper</p>
            <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>fineprintmv.com</p>
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 420 }
  )
}
