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

  const { data, error } = await admin
    .from('upload_drafts')
    .insert({
      artist_id:           user.id,
      type:                body.type,
      series_name:         body.series_name,
      category:            body.category,
      bundle_price:        body.bundle_price        ?? null,
      individual_listings: body.individual_listings ?? true,
      bundle_preview_url:  body.bundle_preview_url  ?? null,
      pieces:              '[]',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

export async function PATCH(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

  const admin   = createAdminClient()
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  if (body.series_name         !== undefined) updates.series_name         = body.series_name
  if (body.category            !== undefined) updates.category            = body.category
  if (body.bundle_price        !== undefined) updates.bundle_price        = body.bundle_price
  if (body.individual_listings !== undefined) updates.individual_listings = body.individual_listings
  if (body.bundle_preview_url  !== undefined) updates.bundle_preview_url  = body.bundle_preview_url
  if (body.pieces              !== undefined) updates.pieces              = body.pieces

  const { data, error } = await admin
    .from('upload_drafts')
    .update(updates)
    .eq('id', body.draft_id)
    .eq('artist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('upload_drafts')
    .select('*')
    .eq('artist_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts: data || [] })
}

export async function DELETE(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('upload_drafts')
    .delete()
    .eq('id', body.draft_id)
    .eq('artist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
