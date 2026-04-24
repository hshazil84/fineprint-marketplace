import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { artworkId, email } = await req.json()

    if (!artworkId || !email) {
      return NextResponse.json({ success: false, error: 'Missing artworkId or email' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = createClient()

    // Check artwork exists and is actually sold out
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, edition_size, editions_sold')
      .eq('id', artworkId)
      .single()

    if (!artwork) {
      return NextResponse.json({ success: false, error: 'Artwork not found' }, { status: 404 })
    }

    // Insert — unique constraint on (artwork_id, email) handles duplicates gracefully
    const { error } = await supabase
      .from('waitlist')
      .upsert({ artwork_id: artworkId, email }, { onConflict: 'artwork_id,email', ignoreDuplicates: true })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
