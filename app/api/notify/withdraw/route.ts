import { NextRequest, NextResponse } from 'next/server'
import { notifyWithdrawRequest } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const { artistName, artistCode, reason } = await req.json()
    await notifyWithdrawRequest({ artistName, artistCode, reason })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
