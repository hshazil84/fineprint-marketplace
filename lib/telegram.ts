// ─────────────────────────────────────────────
// TELEGRAM NOTIFICATIONS
// ─────────────────────────────────────────────
// Setup:
// 1. Message @BotFather on Telegram → /newbot
// 2. Copy the token → TELEGRAM_BOT_TOKEN in .env.local
// 3. Send any message to your new bot
// 4. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
// 5. Copy chat_id → TELEGRAM_CHAT_ID in .env.local
// ─────────────────────────────────────────────

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

// ── New order placed ──────────────────────────
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

// ── Transfer slip uploaded ────────────────────
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
      { text: '❌ Reject',  url: `${APP_URL}/admin/dashboard?reject=${order.invoiceNumber}` },
      { text: '🖼 View slip', url: `${APP_URL}/admin/dashboard?slip=${order.invoiceNumber}` },
    ]]
  })
}

// ── New artist signed up ──────────────────────
export async function notifyNewArtist(artist: {
  name: string
  email: string
  location?: string
}) {
  const text =
    `🎨 <b>New artist signed up</b>\n\n` +
    `<b>${artist.name}</b>\n` +
    `📧 ${artist.email}\n` +
    `📍 ${artist.location || 'Location not set'}\n\n` +
    `<i>No listings yet.</i>`

  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '👤 View profile', url: `${APP_URL}/admin/dashboard?tab=artists` }
    ]]
  })
}

// ── New artwork submitted ─────────────────────
export async function notifyNewArtwork(artwork: {
  sku: string
  title: string
  artistName: string
  price: number
  sizes: string[]
}) {
  const text =
    `🖼 <b>New artwork submitted</b>\n\n` +
    `<code>${artwork.sku}</code>\n` +
    `<b>${artwork.title}</b>\n` +
    `👤 by ${artwork.artistName}\n\n` +
    `💰 MVR ${artwork.price}\n` +
    `📐 Sizes: ${artwork.sizes.join(', ')}\n\n` +
    `<i>Pending your approval before going live.</i>`

  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '✅ Approve', url: `${APP_URL}/admin/dashboard?tab=listings&approve=${artwork.sku}` },
      { text: '❌ Reject',  url: `${APP_URL}/admin/dashboard?tab=listings&reject=${artwork.sku}` },
    ]]
  })
}
