import { createAdminClient } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  // Create series if needed
  let seriesId: string | null = null
  if (body.seriesMode === 'new' && body.newSeriesName) {
    const { data, error } = await admin
      .from('artwork_series')
      .insert({ name: body.newSeriesName, artist_id: user.id })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    seriesId = data.id
  } else if (body.seriesMode === 'existing') {
    seriesId = body.selectedSeriesId
  }

  // Insert artwork
  const { data: artwork, error: dbError } = await admin.from('artworks').insert({
    ...body.artwork,
    artist_id: user.id,
    series_id: seriesId,
  }).select().single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Update series primary if needed
  if (body.isPrimary && seriesId) {
    await admin.from('artwork_series').update({ primary_artwork_id: artwork.id }).eq('id', seriesId)
  }

  // Insert gallery images
  if (body.galleryUrls?.length) {
    await admin.from('artwork_images').insert(
      body.galleryUrls.map((url: string, i: number) => ({
        artwork_id: artwork.id, url, sort_order: i + 1
      }))
    )
  }

  return NextResponse.json({ artwork })
}
