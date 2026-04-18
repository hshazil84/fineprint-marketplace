import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifySlipUploaded } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('slip') as File
    const invoiceNumber = formData.get('invoiceNumber') as string
    const buyerName = formData.get('buyerName') as string
    const totalPaid = parseInt(formData.get('totalPaid') as string)
    const orderSku = formData.get('orderSku') as string

    if (!file || !invoiceNumber) {
      return NextResponse.json({ error: 'Missing file or invoice number' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Upload slip to private Supabase bucket
    const filename = `${invoiceNumber}-${Date.now()}.${file.name.split('.').pop()}`
    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('order-slips')
      .upload(filename, bytes, { contentType: file.type })

    if (uploadError) throw uploadError

    // Update order with slip URL and timestamp
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        slip_url: filename,
        slip_uploaded_at: new Date().toISOString(),
      })
      .eq('invoice_number', invoiceNumber)

    if (updateError) throw updateError

    // Notify via Telegram
    await notifySlipUploaded({ invoiceNumber, orderSku, buyerName, totalPaid })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Slip upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
