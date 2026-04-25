import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createAdminClient()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { artistId, action } = await req.json()

  if (action === 'approve') {
    const { data: artist } = await supabase
      .from('profiles')
      .select('full_name, email, artist_code')
      .eq('id', artistId)
      .single()

    await supabase
      .from('profiles')
      .update({
        account_status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', artistId)

    await supabase
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
    await supabase
      .from('profiles')
      .update({ account_status: 'active' })
      .eq('id', artistId)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
