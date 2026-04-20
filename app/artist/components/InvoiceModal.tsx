'use client'
import { PRINTING_FEES, formatMVR } from '@/lib/pricing'

function getInvoiceHTML({ order, printingFee, hasOffer, date, buyerAddress }: any) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ' + order.invoice_number + '</title>' +
  '<style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}' +
  '.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6}' +
  '@media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>' +
  '<body><div class="wrap">' +
  '<div style="background:#1a1a1a;padding:24px 32px;display:flex;justify-content:space-between">' +
  '<div><div style="font-size:18px;font-weight:600;color:#fff">FinePrint Studio</div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">fineprintmv.com · hello@fineprintmv.com</div></div>' +
  '<div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase">Invoice</div>' +
  '<div style="font-size:14px;font-weight:600;color:#fff;font-family:monospace">' + order.invoice_number + '</div>' +
  '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">' + date + '</div>' +
  '<div style="margin-top:6px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">Approved</div></div></div>' +
  '<div style="padding:24px 32px">' +
  '<table style="width:100%;margin-bottom:20px"><tr>' +
  '<td style="width:50%;vertical-align:top;padding-right:12px">' +
  '<div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Billed to</div>' +
  '<div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">' + order.buyer_name + '</div>' +
  '<div style="font-size:12px;color:#555;line-height:1.7">' + order.buyer_email + '<br>' + order.buyer_phone + '<br>' + buyerAddress + '</div></td>' +
  '<td style="width:50%;vertical-align:top">' +
  '<div style="font-size:10px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Fulfilled by</div>' +
  '<div style="font-size:13px;font-weight:600;color:#111;margin-bottom:3px">FinePrint Studio</div>' +
  '<div style="font-size:12px;color:#555;line-height:1.7">hello@fineprintmv.com<br>fineprintmv.com<br>Male, Maldives</div></td></tr></table>' +
  '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
  '<tr style="border-bottom:1px solid #e8e8e4">' +
  '<th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artwork</th>' +
  '<th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Artist</th>' +
  '<th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:left;font-weight:500">Size</th>' +
  '<th style="font-size:10px;text-transform:uppercase;color:#aaa;padding:6px 0;text-align:right;font-weight:500">Amount</th></tr>' +
  '<tr style="border-bottom:1px solid #f4f4f0">' +
  '<td style="padding:12px 0;vertical-align:top">' +
  '<div style="font-size:13px;font-weight:500;color:#222">' + (order.artworks?.title || '') + '</div>' +
  '<div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">' + order.order_sku + '</div>' +
  (hasOffer ? '<div style="font-size:11px;color:#c05030;margin-top:2px">' + order.offer_label + ' ' + order.offer_pct + '% off</div>' : '') + '</td>' +
  '<td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">' + (order.artworks?.profiles?.full_name || '') + '</td>' +
  '<td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">' + order.print_size + '</td>' +
  '<td style="padding:12px 0;text-align:right;vertical-align:top">' +
  (hasOffer ? '<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ' + order.original_price + '</div>' : '') +
  '<div style="font-size:13px;font-weight:500;color:#222">MVR ' + order.print_price + '</div></td></tr></table>' +
  '<table style="width:220px;margin-left:auto;border-collapse:collapse">' +
  (hasOffer ?
    '<tr><td style="color:#888;padding:3px 0;font-size:13px">Original price</td><td style="text-align:right;font-size:13px">MVR ' + order.original_price + '</td></tr>' +
    '<tr><td style="color:#c05030;padding:3px 0;font-size:13px">' + order.offer_label + ' (' + order.offer_pct + '% off)</td><td style="text-align:right;font-size:13px;color:#c05030">- MVR ' + order.discount_amount + '</td></tr>' :
    '<tr><td style="color:#888;padding:3px 0;font-size:13px">Artwork price</td><td style="text-align:right;font-size:13px">MVR ' + order.original_price + '</td></tr>') +
  '<tr><td style="color:#888;padding:3px 0;font-size:13px">' + order.print_size + ' giclee printing</td><td style="text-align:right;font-size:13px">MVR ' + printingFee + '</td></tr>' +
  (order.delivery_method === 'delivery' ?
    '<tr><td style="color:#888;padding:3px 0;font-size:13px">Handling and delivery</td><td style="text-align:right;font-size:13px">MVR ' + order.handling_fee + '</td></tr>' :
    '<tr><td style="color:#1D9E75;padding:3px 0;font-size:13px">Pickup</td><td style="text-align:right;font-size:13px;color:#1D9E75">Free</td></tr>') +
  '<tr style="border-top:1px solid #e8e8e4">' +
  '<td style="padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">Total paid</td>' +
  '<td style="text-align:right;padding:8px 0 4px;font-size:15px;font-weight:600;color:#111">MVR ' + order.total_paid + '</td></tr></table>' +
  '<div style="border-top:1px solid #f0f0ec;margin:16px 0"></div>' +
  '<p style="font-size:11px;color:#aaa;line-height:1.6;margin:0">Paid via BML bank transfer to account 7703230358101 (Hasan Shazil). ' +
  (order.delivery_method === 'pickup' ? 'Your print will be ready for pickup at FinePrint Studio, Male.' : 'Your print will be dispatched to your address.') + '</p>' +
  '</div><div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">' +
  '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
  '<span style="font-size:11px;color:#1D9E75">fineprintmv.com</span></div></div></body></html>'
}

export function InvoiceModal({ order, profile, onClose }: { order: any, profile: any, onClose: () => void }) {
  const printingFee = order.printing_fee || PRINTING_FEES[order.print_size] || PRINTING_FEES['A4']
  const hasOffer = order.offer_pct && order.offer_pct > 0
  const date = new Date(order.approved_at || order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const buyerAddress = order.delivery_method === 'pickup'
    ? 'Pickup - FinePrint Studio, Male'
    : (order.delivery_island || '') + ', ' + (order.delivery_atoll || '') + ', Maldives'

  function printInvoice() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(getInvoiceHTML({ order, printingFee, hasOffer, date, buyerAddress }))
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printInvoice} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
        <div style={{ padding: 28, maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>FinePrint Studio</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>fineprintmv.com · hello@fineprintmv.com</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{order.invoice_number}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{date}</div>
              <div style={{ marginTop: 6, display: 'inline-block', background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>Approved</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 6 }}>Billed to</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>{order.buyer_name}</p>
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>{order.buyer_email}<br />{order.buyer_phone}<br />{buyerAddress}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 6 }}>Fulfilled by</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>FinePrint Studio</p>
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>hello@fineprintmv.com<br />fineprintmv.com<br />Male, Maldives</p>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e8e4' }}>
                {['Artwork', 'Artist', 'Size', 'Amount'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', padding: '6px 0', textAlign: i === 3 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f4f4f0' }}>
                <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                  <p style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{order.artworks?.title}</p>
                  <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{order.order_sku}</p>
                  {hasOffer && <p style={{ fontSize: 11, color: '#c05030', marginTop: 2 }}>{order.offer_label} {order.offer_pct}% off</p>}
                </td>
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.artworks?.profiles?.full_name || profile?.full_name}</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: '#444', verticalAlign: 'top' }}>{order.print_size}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'top' }}>
                  {hasOffer && <p style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>MVR {order.original_price}</p>}
                  <p style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>MVR {order.print_price}</p>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <table style={{ width: 240, borderCollapse: 'collapse' }}>
              <tbody>
                {hasOffer ? (
                  <>
                    <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Original price</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.original_price}</td></tr>
                    <tr><td style={{ color: '#c05030', padding: '3px 0', fontSize: 13 }}>{order.offer_label} ({order.offer_pct}% off)</td><td style={{ textAlign: 'right', fontSize: 13, color: '#c05030' }}>- MVR {order.discount_amount}</td></tr>
                  </>
                ) : (
                  <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Artwork price</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.original_price}</td></tr>
                )}
                <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>{order.print_size} giclee printing</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {printingFee}</td></tr>
                {order.delivery_method === 'delivery' ? (
                  <tr><td style={{ color: '#888', padding: '3px 0', fontSize: 13 }}>Handling and delivery</td><td style={{ textAlign: 'right', fontSize: 13 }}>MVR {order.handling_fee}</td></tr>
                ) : (
                  <tr><td style={{ color: '#1D9E75', padding: '3px 0', fontSize: 13 }}>Pickup</td><td style={{ textAlign: 'right', fontSize: 13, color: '#1D9E75' }}>Free</td></tr>
                )}
                <tr style={{ borderTop: '1px solid #e8e8e4' }}>
                  <td style={{ padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>Total paid</td>
                  <td style={{ textAlign: 'right', padding: '8px 0 4px', fontSize: 15, fontWeight: 600, color: '#111' }}>MVR {order.total_paid}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid #f0f0ec', marginBottom: 12 }} />
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).
            {order.delivery_method === 'pickup' ? ' Your print will be ready for pickup at FinePrint Studio, Male.' : ' Your print will be dispatched to your address.'}
          </p>
        </div>
      </div>
    </div>
  )
}
