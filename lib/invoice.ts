import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface InvoiceData {
  invoiceNumber: string
  orderSku: string
  date: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string
  artworkTitle: string
  artistName: string
  printSize: string
  originalPrice: number
  offerLabel?: string
  offerPct?: number
  discountAmount?: number
  printPrice: number
  handlingFee: number
  totalPaid: number
  deliveryMethod: 'delivery' | 'pickup'
}

function buildInvoiceHTML(d: InvoiceData): string {
  const hasOffer = d.offerPct && d.offerPct > 0
  const deliveryRow = d.deliveryMethod === 'delivery'
    ? `<tr><td style="color:#888;padding:4px 0;font-size:13px">Handling &amp; delivery</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ${d.handlingFee}</td></tr>`
    : `<tr><td style="color:#888;padding:4px 0;font-size:13px">Delivery</td><td style="text-align:right;padding:4px 0;font-size:13px;color:#1D9E75">Pickup — Free</td></tr>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${d.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0ddd6">

    <!-- Header -->
    <div style="background:#1a1a1a;padding:28px 32px 24px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:20px;font-weight:600;color:#ffffff;letter-spacing:0.02em">
          Fine<span style="color:#9FE1CB">Print</span> Studio
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;letter-spacing:0.04em">
          fineprintmv.com · hello@fineprintmv.com
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">
          Malé, Maldives
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Invoice</div>
        <div style="font-size:16px;font-weight:600;color:#ffffff;font-family:monospace">${d.invoiceNumber}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">${d.date}</div>
        <div style="margin-top:8px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">Approved</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px">

      <!-- Addresses -->
      <table style="width:100%;margin-bottom:24px">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:16px">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Billed to</div>
            <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px">${d.buyerName}</div>
            <div style="font-size:13px;color:#555;line-height:1.7">${d.buyerEmail}<br>${d.buyerPhone}<br>${d.buyerAddress}</div>
          </td>
          <td style="width:50%;vertical-align:top">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Fulfilled by</div>
            <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px">FinePrint Studio</div>
            <div style="font-size:13px;color:#555;line-height:1.7">hello@fineprintmv.com<br>fineprintmv.com<br>Malé, Maldives</div>
          </td>
        </tr>
      </table>

      <!-- Order table -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:10px">Order details</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="border-bottom:1px solid #e8e8e4">
            <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:40%">Artwork</th>
            <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:25%">Artist</th>
            <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:15%">Size</th>
            <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:right;font-weight:500;width:20%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #f4f4f0">
            <td style="padding:12px 0;vertical-align:top">
              <div style="font-size:13px;color:#222;font-weight:500">${d.artworkTitle}</div>
              <div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">${d.orderSku}</div>
              ${hasOffer ? `<div style="font-size:11px;color:#c05030;margin-top:3px">${d.offerLabel} −${d.offerPct}% applied</div>` : ''}
            </td>
            <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${d.artistName}</td>
            <td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">${d.printSize}</td>
            <td style="padding:12px 0;text-align:right;vertical-align:top">
              ${hasOffer ? `<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ${d.originalPrice}</div>` : ''}
              <div style="font-size:13px;color:#222;font-weight:500">MVR ${d.printPrice}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:200px;margin-left:auto;border-collapse:collapse">
        ${hasOffer ? `<tr><td style="color:#888;padding:4px 0;font-size:13px">Original price</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ${d.originalPrice}</td></tr>
        <tr><td style="color:#c05030;padding:4px 0;font-size:13px">${d.offerLabel} (−${d.offerPct}%)</td><td style="text-align:right;padding:4px 0;font-size:13px;color:#c05030">− MVR ${d.discountAmount}</td></tr>` : ''}
        ${deliveryRow}
        <tr style="border-top:1px solid #e8e8e4">
          <td style="padding:10px 0 4px;font-size:15px;font-weight:600;color:#111">Total paid</td>
          <td style="text-align:right;padding:10px 0 4px;font-size:15px;font-weight:600;color:#111">MVR ${d.totalPaid}</td>
        </tr>
      </table>

      <div style="border-top:1px solid #f0f0ec;margin:20px 0"></div>

      <!-- Payment note -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Payment</div>
      <p style="font-size:12px;color:#888;line-height:1.6;margin:0 0 16px">
        Paid via BML bank transfer to account 7703230358101 (Hasan Shazil).
        ${d.deliveryMethod === 'pickup'
          ? 'Your print will be ready for pickup at FinePrint Studio, Malé. We will contact you when it is ready.'
          : 'Your print will be prepared and dispatched to your address.'}
      </p>

      <p style="font-size:12px;color:#aaa;line-height:1.6;margin:0">
        All artwork is protected by copyright and remains the intellectual property of the respective artist.
        Prints are produced and fulfilled exclusively by FinePrint Studio.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f7f7f5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e4">
      <span style="font-size:11px;color:#aaa">FinePrint Studio · Malé, Maldives</span>
      <a href="https://fineprintmv.com" style="font-size:11px;color:#1D9E75;text-decoration:none">fineprintmv.com</a>
    </div>
  </div>
</body>
</html>`
}

export async function sendInvoiceEmail(data: InvoiceData) {
  const html = buildInvoiceHTML(data)
  try {
    await resend.emails.send({
      from: 'FinePrint Studio <hello@fineprintmv.com>',
      to: data.buyerEmail,
      subject: `Your FinePrint Studio order — ${data.invoiceNumber}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send invoice email:', err)
  }
}
