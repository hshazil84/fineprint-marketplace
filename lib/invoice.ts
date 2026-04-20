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
  printingFee: number
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
    ? '<tr><td style="color:#888;padding:4px 0;font-size:13px">Handling and delivery</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ' + d.handlingFee + '</td></tr>'
    : '<tr><td style="color:#888;padding:4px 0;font-size:13px">Delivery</td><td style="text-align:right;padding:4px 0;font-size:13px;color:#1D9E75">Pickup - Free</td></tr>'

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ' + d.invoiceNumber + '</title></head>' +
  '<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' +
  '<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0ddd6">' +
  '<div style="background:#1a1a1a;padding:28px 32px 24px">' +
  '<table style="width:100%"><tr>' +
  '<td><div style="font-size:22px;color:#ffffff;font-family:-apple-system,sans-serif;line-height:1;"><span style="font-weight:300;">fineprint</span><span style="font-weight:700;color:#9FE1CB;">studio</span></div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px">fineprintmv.com · hello@fineprintmv.com</div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">Male, Maldives</div></td>' +
  '<td style="text-align:right;vertical-align:top">' +
  '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Invoice</div>' +
  '<div style="font-size:16px;font-weight:600;color:#ffffff;font-family:monospace">' + d.invoiceNumber + '</div>' +
  '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">' + d.date + '</div>' +
  '<div style="margin-top:8px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">Approved</div>' +
  '</td></tr></table></div>' +
  '<div style="padding:28px 32px">' +
  '<table style="width:100%;margin-bottom:24px"><tr>' +
  '<td style="width:50%;vertical-align:top;padding-right:16px">' +
  '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Billed to</div>' +
  '<div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px">' + d.buyerName + '</div>' +
  '<div style="font-size:13px;color:#555;line-height:1.7">' + d.buyerEmail + '<br>' + d.buyerPhone + '<br>' + d.buyerAddress + '</div></td>' +
  '<td style="width:50%;vertical-align:top">' +
  '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Fulfilled by</div>' +
  '<div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px">FinePrint Studio</div>' +
  '<div style="font-size:13px;color:#555;line-height:1.7">hello@fineprintmv.com<br>fineprintmv.com<br>Male, Maldives</div>' +
  '</td></tr></table>' +
  '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:10px">Order details</div>' +
  '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
  '<thead><tr style="border-bottom:1px solid #e8e8e4">' +
  '<th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:40%">Artwork</th>' +
  '<th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:25%">Artist</th>' +
  '<th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:left;font-weight:500;width:15%">Size</th>' +
  '<th style="font-size:10px;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;text-align:right;font-weight:500;width:20%">Amount</th>' +
  '</tr></thead><tbody>' +
  '<tr style="border-bottom:1px solid #f4f4f0">' +
  '<td style="padding:12px 0;vertical-align:top">' +
  '<div style="font-size:13px;color:#222;font-weight:500">' + d.artworkTitle + '</div>' +
  '<div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">' + d.orderSku + '</div>' +
  (hasOffer ? '<div style="font-size:11px;color:#c05030;margin-top:3px">' + d.offerLabel + ' ' + d.offerPct + '% off applied</div>' : '') +
  '</td>' +
  '<td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">' + d.artistName + '</td>' +
  '<td style="padding:12px 0;font-size:13px;color:#444;vertical-align:top">' + d.printSize + '</td>' +
  '<td style="padding:12px 0;text-align:right;vertical-align:top">' +
  (hasOffer ? '<div style="font-size:12px;color:#aaa;text-decoration:line-through">MVR ' + d.originalPrice + '</div>' : '') +
  '<div style="font-size:13px;color:#222;font-weight:500">MVR ' + d.printPrice + '</div>' +
  '</td></tr></tbody></table>' +
  '<table style="width:220px;margin-left:auto;border-collapse:collapse">' +
  (hasOffer ?
    '<tr><td style="color:#888;padding:4px 0;font-size:13px">Original price</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ' + d.originalPrice + '</td></tr>' +
    '<tr><td style="color:#c05030;padding:4px 0;font-size:13px">' + d.offerLabel + ' (' + d.offerPct + '% off)</td><td style="text-align:right;padding:4px 0;font-size:13px;color:#c05030">- MVR ' + d.discountAmount + '</td></tr>' :
    '<tr><td style="color:#888;padding:4px 0;font-size:13px">Artwork price</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ' + d.originalPrice + '</td></tr>'
  ) +
  '<tr><td style="color:#888;padding:4px 0;font-size:13px">' + d.printSize + ' giclee printing</td><td style="text-align:right;padding:4px 0;font-size:13px">MVR ' + d.printingFee + '</td></tr>' +
  deliveryRow +
  '<tr style="border-top:1px solid #e8e8e4">' +
  '<td style="padding:10px 0 4px;font-size:15px;font-weight:600;color:#111">Total paid</td>' +
  '<td style="text-align:right;padding:10px 0 4px;font-size:15px;font-weight:600;color:#111">MVR ' + d.totalPaid + '</td>' +
  '</tr></table>' +
  '<div style="border-top:1px solid #f0f0ec;margin:20px 0"></div>' +
  '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px">Payment</div>' +
  '<p style="font-size:12px;color:#888;line-height:1.6;margin:0 0 16px">' +
  'Paid via BML bank transfer to account 7703230358101 (Hasan Shazil). ' +
  (d.deliveryMethod === 'pickup'
    ? 'Your print will be ready for pickup at FinePrint Studio, Male. We will contact you when it is ready.'
    : 'Your print will be prepared and dispatched to your address.') +
  '</p>' +
  '<p style="font-size:12px;color:#888;line-height:1.6;margin:0 0 16px">Questions? Reply to this email or contact us at <a href="mailto:hello@fineprintmv.com" style="color:#1D9E75">hello@fineprintmv.com</a></p>' +
  '<p style="font-size:12px;color:#aaa;line-height:1.6;margin:0">All artwork is protected by copyright and remains the intellectual property of the respective artist. Prints are produced and fulfilled exclusively by FinePrint Studio.</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e4">' +
  '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
  '<a href="https://shop.fineprintmv.com" style="font-size:11px;color:#1D9E75;text-decoration:none">shop.fineprintmv.com</a>' +
  '</div></div></body></html>'
}

export async function sendInvoiceEmail(data: InvoiceData) {
  const html = buildInvoiceHTML(data)
  try {
    await resend.emails.send({
      from: 'FinePrint Studio <hello@fineprintmv.com>',
      reply_to: 'hello@fineprintmv.com',
      to: data.buyerEmail,
      subject: 'Your FinePrint Studio order - ' + data.invoiceNumber,
      html,
    })
  } catch (err) {
    console.error('Failed to send invoice email:', err)
  }
}

interface PayoutData {
  artistName: string
  artistEmail: string
  amount: number
  bankName: string
  accountNumber: string
  paidAt: string
}

export async function sendPayoutEmail(data: PayoutData) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payout Confirmation</title></head>' +
  '<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' +
  '<div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0ddd6">' +
  '<div style="background:#1a1a1a;padding:28px 32px 24px">' +
  '<div style="font-size:22px;color:#ffffff;font-family:-apple-system,sans-serif;line-height:1;"><span style="font-weight:300;">fineprint</span><span style="font-weight:700;color:#9FE1CB;">studio</span></div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px">fineprintmv.com · hello@fineprintmv.com</div>' +
  '</div>' +
  '<div style="padding:28px 32px">' +
  '<div style="text-align:center;margin-bottom:24px">' +
  '<div style="font-size:40px;margin-bottom:8px">🎉</div>' +
  '<h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 6px">Your payout is on its way!</h1>' +
  '<p style="font-size:14px;color:#888;margin:0">Hi ' + data.artistName + ', we have processed your payout.</p>' +
  '</div>' +
  '<div style="background:#f0faf6;border:1px solid #9FE1CB;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">' +
  '<p style="font-size:12px;color:#1D9E75;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Amount transferred</p>' +
  '<p style="font-size:32px;font-weight:600;color:#111;margin:0">MVR ' + data.amount.toLocaleString() + '</p>' +
  '<p style="font-size:12px;color:#888;margin:6px 0 0">' + data.paidAt + '</p>' +
  '</div>' +
  '<div style="margin-bottom:24px">' +
  '<p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin:0 0 10px">Transfer details</p>' +
  '<table style="width:100%;border-collapse:collapse">' +
  '<tr style="border-bottom:1px solid #f4f4f0"><td style="padding:10px 0;font-size:13px;color:#888">Bank</td><td style="padding:10px 0;font-size:13px;color:#111;text-align:right;font-weight:500">' + data.bankName + '</td></tr>' +
  '<tr style="border-bottom:1px solid #f4f4f0"><td style="padding:10px 0;font-size:13px;color:#888">Account number</td><td style="padding:10px 0;font-size:13px;color:#111;text-align:right;font-weight:500;font-family:monospace">' + data.accountNumber + '</td></tr>' +
  '<tr style="border-bottom:1px solid #f4f4f0"><td style="padding:10px 0;font-size:13px;color:#888">Amount</td><td style="padding:10px 0;font-size:13px;color:#111;text-align:right;font-weight:500">MVR ' + data.amount.toLocaleString() + '</td></tr>' +
  '<tr><td style="padding:10px 0;font-size:13px;color:#888">Date</td><td style="padding:10px 0;font-size:13px;color:#111;text-align:right;font-weight:500">' + data.paidAt + '</td></tr>' +
  '</table></div>' +
  '<p style="font-size:13px;color:#888;line-height:1.6;margin:0 0 16px">Please allow 1-2 business days for the transfer to appear in your account. Questions? Reply to this email.</p>' +
  '<p style="font-size:13px;color:#888;line-height:1.6;margin:0">Thank you for being part of FinePrint Studio. We look forward to many more sales together!</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e4">' +
  '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
  '<a href="https://shop.fineprintmv.com" style="font-size:11px;color:#1D9E75;text-decoration:none">shop.fineprintmv.com</a>' +
  '</div></div></body></html>'

  try {
    await resend.emails.send({
      from: 'FinePrint Studio <hello@fineprintmv.com>',
      reply_to: 'hello@fineprintmv.com',
      to: data.artistEmail,
      subject: 'Your payout of MVR ' + data.amount.toLocaleString() + ' has been processed',
      html,
    })
  } catch (err) {
    console.error('Failed to send payout email:', err)
  }
}

interface OrderStatusData {
  buyerName: string
  buyerEmail: string
  invoiceNumber: string
  orderSku: string
  artworkTitle: string
  printSize: string
  deliveryMethod: 'delivery' | 'pickup'
  deliveryIsland?: string
  deliveryAtoll?: string
}

export async function sendReadyForPickupEmail(data: OrderStatusData) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Your print is ready!</title></head>' +
  '<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' +
  '<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0ddd6">' +
  '<div style="background:#1a1a1a;padding:28px 32px">' +
  '<div style="font-size:22px;color:#fff;font-family:-apple-system,sans-serif;line-height:1;"><span style="font-weight:300;">fineprint</span><span style="font-weight:700;color:#9FE1CB;">studio</span></div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px">fineprintmv.com · hello@fineprintmv.com</div>' +
  '</div>' +
  '<div style="padding:28px 32px">' +
  '<div style="text-align:center;margin-bottom:24px">' +
  '<div style="font-size:40px;margin-bottom:8px">🎨</div>' +
  '<h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 6px">Your print is ready!</h1>' +
  '<p style="font-size:14px;color:#888;margin:0">Hi ' + data.buyerName + ', your print is ready for collection.</p>' +
  '</div>' +
  '<div style="background:#f0faf6;border:1px solid #9FE1CB;border-radius:12px;padding:20px;margin-bottom:24px">' +
  '<p style="font-size:13px;font-weight:500;color:#111;margin:0 0 8px">' + data.artworkTitle + ' - ' + data.printSize + '</p>' +
  '<p style="font-size:12px;color:#888;font-family:monospace;margin:0">' + data.orderSku + '</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;border-radius:12px;padding:20px;margin-bottom:24px">' +
  '<p style="font-size:13px;font-weight:500;color:#111;margin:0 0 10px">Pickup at FinePrint Studio</p>' +
  '<p style="font-size:13px;color:#555;margin:0 0 6px">Please call us to arrange a convenient pickup time:</p>' +
  '<a href="tel:9998124" style="font-size:20px;font-weight:600;color:#1a1a1a;text-decoration:none;display:block;margin:8px 0">9998124</a>' +
  '<p style="font-size:12px;color:#888;margin:8px 0 0">Studio hours: Sun - Thu, 9am - 6pm</p>' +
  '</div>' +
  '<p style="font-size:12px;color:#aaa;line-height:1.6;margin:0 0 12px">Please bring your invoice number <strong style="font-family:monospace">' + data.invoiceNumber + '</strong> when you collect your print.</p>' +
  '<p style="font-size:12px;color:#888;line-height:1.6;margin:0">Questions? Reply to this email or call us at <a href="tel:9998124" style="color:#1D9E75">9998124</a>.</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e4">' +
  '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
  '<a href="https://shop.fineprintmv.com" style="font-size:11px;color:#1D9E75;text-decoration:none">shop.fineprintmv.com</a>' +
  '</div></div></body></html>'

  try {
    await resend.emails.send({
      from: 'FinePrint Studio <hello@fineprintmv.com>',
      reply_to: 'hello@fineprintmv.com',
      to: data.buyerEmail,
      subject: 'Your print is ready for pickup! - ' + data.invoiceNumber,
      html,
    })
  } catch (err) {
    console.error('Failed to send ready for pickup email:', err)
  }
}

export async function sendOutForDeliveryEmail(data: OrderStatusData) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Your print is on its way!</title></head>' +
  '<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' +
  '<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0ddd6">' +
  '<div style="background:#1a1a1a;padding:28px 32px">' +
  '<div style="font-size:22px;color:#fff;font-family:-apple-system,sans-serif;line-height:1;"><span style="font-weight:300;">fineprint</span><span style="font-weight:700;color:#9FE1CB;">studio</span></div>' +
  '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px">fineprintmv.com · hello@fineprintmv.com</div>' +
  '</div>' +
  '<div style="padding:28px 32px">' +
  '<div style="text-align:center;margin-bottom:24px">' +
  '<div style="font-size:40px;margin-bottom:8px">📦</div>' +
  '<h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 6px">Your print is on its way!</h1>' +
  '<p style="font-size:14px;color:#888;margin:0">Hi ' + data.buyerName + ', your order has been dispatched.</p>' +
  '</div>' +
  '<div style="background:#f0faf6;border:1px solid #9FE1CB;border-radius:12px;padding:20px;margin-bottom:24px">' +
  '<p style="font-size:13px;font-weight:500;color:#111;margin:0 0 8px">' + data.artworkTitle + ' - ' + data.printSize + '</p>' +
  '<p style="font-size:12px;color:#888;font-family:monospace;margin:0">' + data.orderSku + '</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;border-radius:12px;padding:20px;margin-bottom:24px">' +
  '<p style="font-size:13px;font-weight:500;color:#111;margin:0 0 10px">Delivering to</p>' +
  '<p style="font-size:13px;color:#555;margin:0 0 10px">' + (data.deliveryIsland || '') + ', ' + (data.deliveryAtoll || '') + ', Maldives</p>' +
  '<p style="font-size:13px;color:#555;margin:0">Please expect a call from us on <strong>9998124</strong> to arrange delivery at your convenience.</p>' +
  '</div>' +
  '<p style="font-size:12px;color:#aaa;line-height:1.6;margin:0 0 12px">Your invoice number is <strong style="font-family:monospace">' + data.invoiceNumber + '</strong>.</p>' +
  '<p style="font-size:12px;color:#888;line-height:1.6;margin:0">Questions? Reply to this email or call us at <a href="tel:9998124" style="color:#1D9E75">9998124</a>.</p>' +
  '</div>' +
  '<div style="background:#f7f7f5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e4">' +
  '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
  '<a href="https://shop.fineprintmv.com" style="font-size:11px;color:#1D9E75;text-decoration:none">shop.fineprintmv.com</a>' +
  '</div></div></body></html>'

  try {
    await resend.emails.send({
      from: 'FinePrint Studio <hello@fineprintmv.com>',
      reply_to: 'hello@fineprintmv.com',
      to: data.buyerEmail,
      subject: 'Your print is on its way! - ' + data.invoiceNumber,
      html,
    })
  } catch (err) {
    console.error('Failed to send out for delivery email:', err)
  }
}
