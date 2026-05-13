import { createAdminClient } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  /*
    body shape:
    {
      draft_id:     string | null       — null for single artwork
      type:         'single' | 'variant' | 'bundle'
      series_id:    string | null       — null if this is the first piece (we create it here)
      series_name:  string | null
      series_type:  'variant' | 'bundle'
      bundle_price: number | null
      individual_listings: boolean | null
      bundle_preview_url:  string | null
      is_primary:   boolean             — variant only: does this piece show on storefront
      is_first_piece: boolean           — true if series_id doesn't exist yet
      galleryUrls:  string[]
      artwork: {
        sku, title, description, price, hires_path, preview_url,
        sizes, status, category, painting_by, paper_type,
        edition_size, editions_sold, series_label
      }
    }
  */

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

    if (seriesError) return NextResponse.json({ error: seriesError.message }, { status: 500 })
    seriesId = series.id
  }

  // Insert artwork
  const { data: artwork, error: artworkError } = await admin
    .from('artworks')
    .insert({
      ...body.artwork,
      artist_id: user.id,
      series_id: seriesId,
      is_primary: body.type === 'single' ? true : (body.is_primary ?? false),
    })
    .select()
    .single()

  if (artworkError) return NextResponse.json({ error: artworkError.message }, { status: 500 })

  // Insert gallery images
  if (body.galleryUrls?.length) {
    await admin.from('artwork_images').insert(
      body.galleryUrls.map((url: string, i: number) => ({
        artwork_id: artwork.id,
        url,
        sort_order: i + 1,
      }))
    )
  }

  // Update draft pieces jsonb to mark this piece as submitted
  if (body.draft_id) {
    const { data: draft } = await admin
      .from('upload_drafts')
      .select('pieces')
      .eq('id', body.draft_id)
      .eq('artist_id', user.id)
      .single()

    if (draft) {
      const pieces = draft.pieces as any[]
      const updated = pieces.map((p: any) =>
        p.label === body.artwork.series_label
          ? { ...p, submitted: true, artwork_id: artwork.id, sku: body.artwork.sku }
          : p
      )
      await admin
        .from('upload_drafts')
        .update({ pieces: updated, updated_at: new Date().toISOString() })
        .eq('id', body.draft_id)
        .eq('artist_id', user.id)
    }
  }

  // If all pieces submitted, delete the draft
  if (body.draft_id && body.is_last_piece) {
    await admin
      .from('upload_drafts')
      .delete()
      .eq('id', body.draft_id)
      .eq('artist_id', user.id)
  }

  return NextResponse.json({ artwork, series_id: seriesId })
}
