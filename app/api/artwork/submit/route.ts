import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function getUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  return user ?? null
}

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body  = await req.json()
  const admin = createAdminClient()

  let seriesId: string | null = body.series_id ?? null

  // Create series on first piece of a variant or bundle
  if (body.type !== 'single' && body.is_first_piece) {
    const { data: series, error: seriesError } = await admin
      .from('artwork_series')
      .insert({
        artist_id:           user.id,
        name:                body.series_name,
        type:                body.series_type,
        bundle_price:        body.bundle_price        ?? null,
        individual_listings: body.individual_listings ?? true,
        bundle_preview_url:  body.bundle_preview_url  ?? null,
      })
      .select()
      .single()

    if (seriesError) return NextResponse.json({ error: 'series insert: ' + seriesError.message }, { status: 500 })
    seriesId = series.id
  }

  // Insert artwork
  const { data: artwork, error: artworkError } = await admin
    .from('artworks')
    .insert({
      ...body.artwork,
      artist_id:  user.id,
      series_id:  seriesId,
      is_primary: body.type === 'single' ? true : (body.is_primary ?? false),
    })
    .select()
    .single()

  if (artworkError) return NextResponse.json({ error: 'artwork insert: ' + artworkError.message }, { status: 500 })

  // Insert gallery images
  if (body.galleryUrls?.length) {
    const { error: galleryError } = await admin
      .from('artwork_images')
      .insert(
        body.galleryUrls.map((url: string, i: number) => ({
          artwork_id: artwork.id,
          url,
          sort_order: i + 1,
        }))
      )
    if (galleryError) return NextResponse.json({ error: 'gallery insert: ' + galleryError.message }, { status: 500 })
  }

  // Update draft pieces jsonb
  if (body.draft_id) {
    const { data: draft } = await admin
      .from('upload_drafts')
      .select('pieces')
      .eq('id', body.draft_id)
      .eq('artist_id', user.id)
      .single()

    if (draft) {
      const pieces = Array.isArray(draft.pieces) ? draft.pieces : JSON.parse(draft.pieces || '[]')
      const updated = pieces.map((p: any) =>
        p.label === body.artwork.series_label
          ? { ...p, submitted: true, artwork_id: artwork.id, sku: body.artwork.sku }
          : p
      )
      await admin
        .from('upload_drafts')
        .update({ pieces: JSON.stringify(updated), updated_at: new Date().toISOString() })
        .eq('id', body.draft_id)
        .eq('artist_id', user.id)
    }
  }

  // Delete draft if last piece
  if (body.draft_id && body.is_last_piece) {
    await admin
      .from('upload_drafts')
      .delete()
      .eq('id', body.draft_id)
      .eq('artist_id', user.id)
  }

  return NextResponse.json({ artwork, series_id: seriesId })
}
