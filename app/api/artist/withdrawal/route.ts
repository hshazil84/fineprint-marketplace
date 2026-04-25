import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'pause') {
    await supabase
      .from('profiles')
      .update({ account_status: 'paused' })
      .eq('id', user.id)

    await supabase
      .from('artworks')
      .update({ is_active: false })
      .eq('artist_id', user.id)

    return NextResponse.json({ ok: true, status: 'paused' })
  }

  if (action === 'unpause') {
    await supabase
      .from('profiles')
      .update({ account_status: 'active' })
      .eq('id', user.id)

    await supabase
      .from('artworks')
      .update({ is_active: true })
      .eq('artist_id', user.id)

    return NextResponse.json({ ok: true, status: 'active' })
  }

  if (action === 'request_withdrawal') {
    await supabase
      .from('profiles')
      .update({ account_status: 'pending_withdrawal' })
      .eq('id', user.id)

    const { data: profile } = await supabase
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
}
