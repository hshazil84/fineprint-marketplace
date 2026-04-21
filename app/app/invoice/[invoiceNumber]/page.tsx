'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMVR, PRINTING_FEES } from '@/lib/pricing'

export default function InvoicePage() {
  const { invoiceNumber } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single()

      if (!orderData) { setLoading(false); return }
      setOrder(orderData)

      // Fetch order items with artwork + artist details
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, artworks(title, sku, profiles:artist_id(full_name, display_name))')
        .eq('order_id', orderData.id)

      if (orderItems && orderItems.length > 0) {
        setItems(orderItems)
      } else {
        // Fallback for legacy single-item orders
        const { data: artwork } = await supabase
          .from('artworks')
          .select('title, sku, profiles:artist_id(full_name, display_name)')
          .eq('id', orderData.artwork_id)
          .single()

        setItems([{
          artwork_id:      orderData.artwork_id,
          print_size:      orderData.print_size,
          original_price:  orderData.original_price,
          offer_pct:       orderData.offer_pct,
          offer_label:     orderData.offer_label,
          discount_amount: orderData.discount_amount,
          print_price:     orderData.print_price,
          printing_fee:    orderData.printing_fee || PRINTING_FEES[orderData.print_size] || PRINTING_FEES['A4'],
          artworks:        artwork,
        }])
      }

      setLoading(false)
    }
    load()
  }, [invoiceNumber])

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading...</div>
  if (!order) return <div style={{ padding: 60, textAlign: 'center' }}>Invoice not found.</div>

  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup — FinePrint Studio, Malé'
    : `${order.delivery_island || ''}, ${order.delivery_atoll || ''}, Maldives`

  const isSwipe = order.payment_method === 'swipe'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-wrap { box-shadow: none !important; border: none !important; margin: 0 !important; }
        }
        body { margin: 0; padding: 0; background: #f0f0ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* Print/Close bar */}
      <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1a1a1a', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <span style={{ color: '#fff', fontSize: 13 }}>Invoice {order.invoice_number}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            🖨 Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="invoice-wrap" style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e0ddd6', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div style={{ background: '#1a1a1a', padding: '28px 40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>
                Fine<span style={{ color: '#9FE1CB' }}>Print</span> Studio
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>fineprintmv.com · hello@fineprintmv.com</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Malé, Maldives</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{date}</div>
              <div style={{ marginTop: 8, display: 'inline-block', background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                {order.status === 'approved' ? 'Approved' : order.status}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '32px 40px' }}>

            {/* Addresses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>Billed to</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>{order.buyer_name}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                  {order.buyer_email}<br />
                  {order.buyer_phone}<br />
                  {buyerAddress}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>Fulfilled by</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>FinePrint Studio</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                  hello@fineprintmv.com<br />
                  fineprintmv.com<br />
                  Malé, Maldives
                </div>
              </div>
            </div>

            {/* Order details */}
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 10 }}>
              Order details · {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e8e8e4' }}>
                  {['Artwork', 'Artist', 'Size', 'Amount'].map((h, i) => (
                    <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#aaa', padding: '8px 0', textAlign: i === 3 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const hasOffer = item.offer_pct && item.offer_pct > 0
                  const artistName = item.artworks?.profiles?.display_name || item.artworks?.profiles?.full_name || '—'
                  const itemSku = item.artworks?.sku ? item.artworks.sku + '-' + item.print_size : order.order_sku
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f4f4f0' }}>
                      <td style={{ padding: '14px 0', verticalAlign: 'top' }}>
                        <div style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>{item.artworks?.title}</div>
                        <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{itemSku}</div>
                        {hasOffer && <div style={{ fontSize: 11, color: '#c05030', marginTop: 3 }}>{item.offer_label} −{item.offer_pct}% applied</div>}
                      </td>
                      <td style={{ padding: '14px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{artistName}</td>
                      <td style={{ padding: '14px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{item.print_size}</td>
                      <td style={{ padding: '14px 0', textAlign: 'right', verticalAlign: 'top' }}>
                        {hasOffer && <div style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {item.original_price + item.printing_fee}</div>}
                        <div style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>MVR {item.print_price}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <table style={{ width: 280, borderCollapse: 'collapse' }}>
                {items.map((item, i) => {
                  const hasOffer = item.offer_pct && item.offer_pct > 0
                  const printingFee = item.printing_fee || PRINTING_FEES[item.print_size] || PRINTING_FEES['A4']
                  return (
                    <tbody key={i}>
                      {items.length > 1 && (
                        <tr>
                          <td colSpan={2} style={{ color: '#aaa', padding: '6px 0 2px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {item.artworks?.title}
                          </td>
                        </tr>
                      )}
                      {hasOffer ? (
                        <>
                          <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Artwork price</td><td style={{ textAlign: 'right', padding: '3px 0', fontSize: 13, color: '#aaa', textDecoration: 'line-through' }}>MVR {item.original_price}</td></tr>
                          <tr><td style={{ color: '#c05030', padding: '3px 0', fontSize: 13 }}>{item.offer_label} (−{item.offer_pct}%)</td><td style={{ textAlign: 'right', padding: '3px 0', fontSize: 13, color: '#c05030' }}>− MVR {item.discount_amount}</td></tr>
                        </>
                      ) : (
                        <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Artwork price</td><td style={{ textAlign: 'right', padding: '3px 0', fontSize: 13 }}>MVR {item.original_price}</td></tr>
                      )}
                      <tr>
                        <td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>{item.print_size} giclée printing</td>
                        <td style={{ textAlign: 'right', padding: '3px 0', fontSize: 13 }}>MVR {printingFee}</td>
                      </tr>
                    </tbody>
                  )
                })}
                <tbody>
                  {order.delivery_method === 'delivery' ? (
                    <tr><td style={{ color: '#888', padding: '4px 0', fontSize: 13 }}>Handling & delivery</td><td style={{ textAlign: 'right', padding: '4px 0', fontSize: 13 }}>MVR {order.handling_fee}</td></tr>
                  ) : (
                    <tr><td style={{ color: '#1D9E75', padding: '4px 0', fontSize: 13 }}>Pickup</td><td style={{ textAlign: 'right', padding: '4px 0', fontSize: 13, color: '#1D9E75' }}>Free</td></tr>
                  )}
                  <tr style={{ borderTop: '1px solid #e8e8e4' }}>
                    <td style={{ padding: '10px 0 4px', fontSize: 16, fontWeight: 600, color: '#111' }}>Total paid</td>
                    <td style={{ textAlign: 'right', padding: '10px 0 4px', fontSize: 16, fontWeight: 600, color: '#111' }}>MVR {order.total_paid}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid #f0f0ec', margin: '24px 0' }} />

            {/* Payment note */}
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>Payment</div>
            <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, margin: '0 0 12px' }}>
              {isSwipe
                ? 'Paid via Swipe to hasan@swipe.'
                : 'Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).'}
              {order.delivery_method === 'pickup'
                ? ' Your print(s) will be ready for pickup at FinePrint Studio, Malé. We will contact you when ready.'
                : ' Your print(s) will be prepared and dispatched to your address.'}
            </p>
            <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
              All artwork is protected by copyright and remains the intellectual property of the respective artist.
              Prints are produced and fulfilled exclusively by FinePrint Studio.
            </p>
          </div>

          {/* Footer */}
          <div style={{ background: '#f7f7f5', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e8e8e4' }}>
            <span style={{ fontSize: 11, color: '#aaa' }}>FinePrint Studio · Malé, Maldives</span>
            <span style={{ fontSize: 11, color: '#1D9E75' }}>fineprintmv.com</span>
          </div>
        </div>
      </div>
    </>
  )
}
