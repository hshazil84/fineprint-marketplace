import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const { artistName, artistCode, reason } = await req.json()
    await sendTelegramMessage(
      'WITHDRAWAL REQUEST\n\n' +
      'Artist: ' + artistName + ' (FP-' + artistCode + ')\n' +
      'Reason: ' + reason + '\n\n' +
      'Please check the admin dashboard.'
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
