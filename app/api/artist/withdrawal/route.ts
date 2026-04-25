import { createAdminClient, createAnonClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  console.log('withdrawal route hit, auth:', req.headers.get('authorization')?.slice(0, 20))
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized - no token' }, { status: 401 })

    const anon = createAnonClient()
    const { data: { user }, error } = await anon.auth.getUser(token)
    console.log('user:', user?.id, 'error:', error?.message)
    if (!user) return NextResponse.json({ error: 'Unauthorized', detail: error?.message }, { status: 401 })

    const admin = createAdminClient()
    const { action } = await req.json()

    if (action === 'pause') {
      await admin.from('profiles').update({ account_status: 'paused' }).eq('id', user.id)
      await admin.from('artworks').update({ is_active: false }).eq('artist_id', user.id)
      return NextResponse.json({ ok: true, status: 'paused' })
    }

    if (action === 'unpause') {
      await admin.from('profiles').update({ account_status: 'active' }).eq('id', user.id)
      await admin.from('artworks').update({ is_active: true }).eq('artist_id', user.id)
      return NextResponse.json({ ok: true, status: 'active' })
    }

    if (action === 'request_withdrawal') {
      await admin
        .from('profiles')
        .update({ account_status: 'pending_withdrawal' })
        .eq('id', user.id)

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email, artist_code')
        .eq('id', user.id)
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
