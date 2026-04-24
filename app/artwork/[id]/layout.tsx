import { Metadata } from 'next'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function resizeImage(imageUrl: string): string {
  if (!imageUrl) return imageUrl
  return imageUrl + '?width=1200&height=630&resize=cover'
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const res = await fetch(
      url + '/rest/v1/artworks?id=eq.' + params.id + '&select=title,price,preview_url,description,sku,profiles:artist_id(full_name,display_name)&limit=1',
      {
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key },
        cache: 'no-store',
      }
    )
    const rows = await res.json()
    const a    = rows?.[0]
    if (!a) return { title: 'FinePrint Studio' }

    const artistName  = a.profiles?.display_name || a.profiles?.full_name || ''
    const title       = a.title + ' by ' + artistName + ' — FinePrint Studio'
    const description = a.description
      ? a.description.slice(0, 155)
      : 'Giclee art print on Hahnemuhle archival paper. Order online and receive anywhere in the Maldives.'
    const pageUrl     = 'https://shop.fineprintmv.com/artwork/' + params.id
    const imageUrl    = a.preview_url ? resizeImage(a.preview_url) : ''

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url:      pageUrl,
        siteName: 'FinePrint Studio',
        type:     'website',
        images:   imageUrl ? [{
          url:    imageUrl,
          width:  1200,
          height: 630,
          alt:    a.title + ' by ' + artistName,
        }] : [],
      },
      twitter: {
        card:        'summary_large_image',
        title,
        description,
        images:      imageUrl ? [imageUrl] : [],
      },
    }
  } catch {
    return { title: 'FinePrint Studio' }
  }
}

export default function ArtworkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
