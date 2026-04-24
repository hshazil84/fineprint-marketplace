import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { artworkId } = await req.json()
    if (!artworkId) return NextResponse.json({ success: false, error: 'Missing artworkId' }, { status: 400 })

    const supabase = createAdminClient()

    // Get artwork details
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, sku, preview_url')
      .eq('id', artworkId)
      .single()

    if (!artwork) return NextResponse.json({ success: false, error: 'Artwork not found' }, { status: 404 })

    // Get unnotified waitlist entries
    const { data: waitlist } = await supabase
      .from('waitlist')
      .select('id, email')
      .eq('artwork_id', artworkId)
      .is('notified_at', null)

    if (!waitlist || waitlist.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const artworkUrl = process.env.NEXT_PUBLIC_SITE_URL + '/artwork/' + artworkId
    const notifiedAt = new Date().toISOString()

    // Send emails
    await Promise.all(waitlist.map(entry =>
      resend.emails.send({
        from:    'FinePrint Studio <hello@fineprintmv.com>',
        to:      entry.email,
        subject: artwork.title + ' is back — FinePrint Studio',
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
            <div style="font-size:18px;font-weight:600;margin-bottom:24px">
              Fine<span style="color:#1D9E75">Print</span> Studio
            </div>
            <p style="font-size:15px;font-weight:500;margin-bottom:8px">Good news — ${artwork.title} is available again</p>
            <p style="font-size:14px;color:#666;line-height:1.6;margin-bottom:24px">
              You signed up to be notified when this artwork became available again. It's now back in stock — order before it sells out.
            </p>
            ${artwork.preview_url ? `<img src="${artwork.preview_url}" style="width:100%;border-radius:8px;margin-bottom:24px" />` : ''}
            <a href="${artworkUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500">
              View &amp; order now
            </a>
            <p style="font-size:11px;color:#aaa;margin-top:32px;line-height:1.6">
              You received this because you joined the waitlist for ${artwork.title} on FinePrint Studio.<br/>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/storefront" style="color:#1D9E75">Browse all artworks</a>
            </p>
          </div>
        `,
      })
    ))

    // Mark all as notified
    await supabase
      .from('waitlist')
      .update({ notified_at: notifiedAt })
      .eq('artwork_id', artworkId)
      .is('notified_at', null)

    return NextResponse.json({ success: true, count: waitlist.length })
  } catch (err: any) {
    console.error('Waitlist notify error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
