import { NextRequest, NextResponse } from 'next/server'
import { sendPayoutEmail } from '@/lib/invoice'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await sendPayoutEmail(body)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
