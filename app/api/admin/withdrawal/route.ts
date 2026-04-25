import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { artistId, action } = await req.json()
    if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 })

    const admin = createAdminClient()

    if (action === 'approve') {
      const { data: artist } = await admin
        .from('profiles')
        .select('full_name, email, artist_code')
        .eq('id', artistId)
        .single()

      await admin
        .from('profiles')
        .update({
          account_status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
        })
        .eq('id', artistId)

      await admin
        .from('artworks')
        .update({ is_active: false })
        .eq('artist_id', artistId)

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FinePrint <no-reply@fineprintmv.com>',
          to: artist?.email,
          subject: 'Your FinePrint account has been withdrawn',
          html: `
            <p>Hi ${artist?.full_name},</p>
            <p>Your withdrawal request has been approved. Your account and listings are now deactivated.</p>
            <p>If you ever want to return, reach out to us at hello@fineprintmv.com.</p>
            <p>Thank you for being part of FinePrint. 🎨</p>
          `,
        }),
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'reject') {
      await admin
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', artistId)

      return NextResponse.json({ ok: true })
    }

    if (action === 'reactivate') {
      await admin
        .from('profiles')
        .update({
          account_status: 'active',
          withdrawn_at: null,
        })
        .eq('id', artistId)

      await admin
        .from('artworks')
        .update({ is_active: true })
        .eq('artist_id', artistId)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (err: any) {
    console.log('admin withdrawal error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
