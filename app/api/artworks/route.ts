import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifyNewArtwork } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const artistId    = formData.get('artistId') as string
    const title       = formData.get('title') as string
    const description = formData.get('description') as string
    const price       = parseInt(formData.get('price') as string)
    const sizes       = JSON.parse(formData.get('sizes') as string) as string[]
    const hiresFile   = formData.get('hires') as File

    const supabase = createAdminClient()

    // Get artist profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, artist_code')
      .eq('id', artistId)
      .single()

    if (!profile) throw new Error('Artist profile not found')

    // Count existing artworks to generate sequence number
    const { count } = await supabase
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)

    const seq = String((count || 0) + 1).padStart(3, '0')
    const sku = `FP-${profile.artist_code}-${seq}`

    // Upload high-res to private bucket
    let hiresPath = null
    if (hiresFile && hiresFile.size > 0) {
      hiresPath = `${sku}-hires.${hiresFile.name.split('.').pop()}`
      const bytes = await hiresFile.arrayBuffer()
      await supabase.storage
        .from('artwork-hires')
        .upload(hiresPath, bytes, { contentType: hiresFile.type })
    }

    // Insert artwork record
    const { data: artwork, error } = await supabase
      .from('artworks')
      .insert({
        sku,
        artist_id:   artistId,
        title,
        description,
        price,
        preview_url: null,
        hires_path:  hiresPath,
        sizes,
        status:      'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Notify admin via Telegram
    await notifyNewArtwork({
      sku,
      title,
      artistName: profile.full_name,
      price,
      sizes,
    })

    return NextResponse.json({ success: true, sku, artworkId: artwork.id })
  } catch (err: any) {
    console.error('Artwork upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
