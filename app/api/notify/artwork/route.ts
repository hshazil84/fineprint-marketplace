import { NextRequest, NextResponse } from 'next/server'
import { notifyNewArtwork } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await notifyNewArtwork(body)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
