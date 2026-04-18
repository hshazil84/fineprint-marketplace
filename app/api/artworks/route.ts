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
    const previewFile = formData.get('preview') as File   // low-res
    const hiresFile   = formData.get('hires') as File     // high-res

    const supabase = createAdminClient()

    // Generate SKU
    const { data: sku } = await supabase.rpc('generate_artwork_sku', { p_artist_id: artistId })

    // Upload low-res preview to public bucket
    let previewUrl = null
    if (previewFile) {
      const previewPath = `${sku}-preview.${previewFile.name.split('.').pop()}`
      const bytes = await previewFile.arrayBuffer()
      const { error } = await supabase.storage
        .from('artwork-previews')
        .upload(previewPath, bytes, { contentType: previewFile.type })
      if (!error) {
        const { data } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)
        previewUrl = data.publicUrl
      }
    }

    // Upload high-res to private bucket
    let hiresPath = null
    if (hiresFile) {
      hiresPath = `${sku}-hires.${hiresFile.name.split('.').pop()}`
      const bytes = await hiresFile.arrayBuffer()
      await supabase.storage
        .from('artwork-hires')
        .upload(hiresPath, bytes, { contentType: hiresFile.type })
    }

    // Get artist name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', artistId)
      .single()

    // Insert artwork record
    const { data: artwork, error } = await supabase
      .from('artworks')
      .insert({
        sku,
        artist_id:   artistId,
        title,
        description,
        price,
        preview_url: previewUrl,
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
      artistName: profile?.full_name || 'Unknown',
      price,
      sizes,
    })

    return NextResponse.json({ success: true, sku, artworkId: artwork.id })
  } catch (err: any) {
    console.error('Artwork upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
