import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_order_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ customers: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
