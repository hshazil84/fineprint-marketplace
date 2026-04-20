const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://fineprintmv.com'

async function sendTelegram(text: string, keyboard?: object) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram not configured — skipping notification')
    return
  }
  const body: any = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
  }
  if (keyboard) body.reply_markup = keyboard
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('Telegram send error:', err)
  }
}

export async function notifyNewOrder(order: {
  invoiceNumber: string
  orderSku: string
  artworkTitle: string
  artistName: string
  buyerName: string
  buyerPhone: string
  deliveryMethod: string
  deliveryIsland?: string
  deliveryAtoll?: string
  totalPaid: number
  offerLabel?: string
  offerPct?: number
}) {
  const delivery = order.deliveryMethod === 'pickup'
    ? '🏪 Pickup — Malé studio'
    : `📦 Deliver → ${order.deliveryIsland}, ${order.deliveryAtoll}`
  const offer = order.offerPct
    ? `\n🏷 <b>Offer:</b> ${order.offerLabel} −${order.offerPct}%`
    : ''
  const text =
    `🖼 <b>New order</b>\n\n` +
    `<b>${order.invoiceNumber}</b> · <code>${order.orderSku}</code>\n\n` +
    `📌 <b>${order.artworkTitle}</b>\n` +
    `👤 by ${order.artistName}${offer}\n\n` +
    `🛒 <b>Buyer:</b> ${order.buyerName}\n` +
    `📞 ${order.buyerPhone}\n` +
    `${delivery}\n\n` +
    `💰 <b>Total:</b> MVR ${order.totalPaid}\n` +
    `📎 <i>Awaiting transfer slip...</i>`
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '📋 View in dashboard', url: `${APP_URL}/admin/dashboard` }
    ]]
  })
}

export async function notifySlipUploaded(order: {
  invoiceNumber: string
  orderSku: string
  buyerName: string
  totalPaid: number
}) {
  const text =
    `📎 <b>Slip uploaded</b>\n\n` +
    `<b>${order.invoiceNumber}</b> · <code>${order.orderSku}</code>\n\n` +
    `👤 ${order.buyerName} uploaded their BML transfer slip.\n` +
    `💰 Amount: MVR ${order.totalPaid}\n\n` +
    `<i>Ready for your review.</i>`
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '✅ Approve', url: `${APP_URL}/admin/dashboard?approve=${order.invoiceNumber}` },
      { text: '❌ Reject',  url: `${APP_URL}/admin/dashbo
