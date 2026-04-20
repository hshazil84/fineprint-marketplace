import { NextRequest, NextResponse } from 'next/server'
import { notifyShopStatus } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const { artistName, artistCode, status } = await req.json()
    await notifyShopStatus({ artistName, artistCode, status })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
