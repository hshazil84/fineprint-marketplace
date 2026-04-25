import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { action, artistId } = await req.json()
    if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 })

    const admin = createAdminClient()

    if (action === 'pause') {
      await admin.from('profiles').update({ account_status: 'paused' }).eq('id', artistId)
      await admin.from('artworks').update({ is_active: false }).eq('artist_id', artistId)
      return NextResponse.json({ ok: true, status: 'paused' })
    }

    if (action === 'unpause') {
      await admin.from('profiles').update({ account_status: 'active' }).eq('id', artistId)
      await admin.from('artworks').update({ is_active: true }).eq('artist_id', artistId)
      return NextResponse.json({ ok: true, status: 'active' })
    }

    if (action === 'request_withdrawal') {
      await admin
        .from('profiles')
        .update({ account_status: 'pending_withdrawal' })
        .eq('id', artistId)

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email, artist_code')
        .eq('id', artistId)
        .single()

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FinePrint <no-reply@fineprintmv.com>',
          to: 'admin@fineprintmv.com',
          subject: `Withdrawal request — ${profile?.artist_code}`,
          html: `
            <p><strong>${profile?.full_name}</strong> (${profile?.artist_code}) has requested full withdrawal.</p>
            <p>Email: ${profile?.email}</p>
            <p>Review and approve or reject in the <a href="https://shop.fineprintmv.com/admin">admin dashboard</a>.</p>
          `,
        }),
      })

      return NextResponse.json({ ok: true, status: 'pending_withdrawal' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (err: any) {
    console.log('route error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
