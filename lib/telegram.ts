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
    await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
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
  paymentMethod?: string
  itemCount?: number
}) {
  const delivery = order.deliveryMethod === 'pickup'
    ? '🏪 Pickup — Male studio'
    : '📦 Deliver to ' + order.deliveryIsland + ', ' + order.deliveryAtoll
  const offer = order.offerPct
    ? '\n🏷 <b>Offer:</b> ' + order.offerLabel + ' ' + order.offerPct + '% off'
    : ''
  const payment = order.paymentMethod === 'swipe'
    ? '💳 <b>Payment:</b> Swipe — verify in your Swipe app'
    : '🏦 <b>Payment:</b> BML bank transfer — awaiting slip'
  const itemLine = order.itemCount && order.itemCount > 1
    ? '🛍 <b>' + order.itemCount + ' items:</b> ' + order.artworkTitle + '\n'
    : '📌 <b>' + order.artworkTitle + '</b>\n' + '👤 by ' + order.artistName + offer + '\n'

  const text =
    '🖼 <b>New order</b>\n\n' +
    '<b>' + order.invoiceNumber + '</b> · <code>' + order.orderSku + '</code>\n\n' +
    itemLine + '\n' +
    '🛒 <b>Buyer:</b> ' + order.buyerName + '\n' +
    '📞 ' + order.buyerPhone + '\n' +
    delivery + '\n\n' +
    '💰 <b>Total:</b> MVR ' + order.totalPaid + '\n' +
    payment

  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '📋 View in dashboard', url: APP_URL + '/admin/dashboard' }
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
    '📎 <b>Slip uploaded</b>\n\n' +
    '<b>' + order.invoiceNumber + '</b> · <code>' + order.orderSku + '</code>\n\n' +
    '👤 ' + order.buyerName + ' uploaded their BML transfer slip.\n' +
    '💰 Amount: MVR ' + order.totalPaid + '\n\n' +
    '<i>Ready for your review.</i>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '✅ Approve', url: APP_URL + '/admin/dashboard?approve=' + order.invoiceNumber },
      { text: '❌ Reject', url: APP_URL + '/admin/dashboard?reject=' + order.invoiceNumber },
      { text: '🖼 View slip', url: APP_URL + '/admin/dashboard?slip=' + order.invoiceNumber },
    ]]
  })
}

export async function notifyNewArtist(artist: {
  name: string
  email: string
  location?: string
}) {
  const text =
    '🎨 <b>New artist signed up</b>\n\n' +
    '<b>' + artist.name + '</b>\n' +
    '📧 ' + artist.email + '\n' +
    '📍 ' + (artist.location || 'Location not set') + '\n\n' +
    '<i>No listings yet.</i>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '👤 View profile', url: APP_URL + '/admin/dashboard?tab=artists' }
    ]]
  })
}

export async function notifyNewArtwork(artwork: {
  sku: string
  title: string
  artistName: string
  price: number
  sizes: string[]
}) {
  const text =
    '🖼 <b>New artwork submitted</b>\n\n' +
    '<code>' + artwork.sku + '</code>\n' +
    '<b>' + artwork.title + '</b>\n' +
    '👤 by ' + artwork.artistName + '\n\n' +
    '💰 MVR ' + artwork.price + '\n' +
    '📐 Sizes: ' + artwork.sizes.join(', ') + '\n\n' +
    '<i>Pending your approval before going live.</i>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '✅ Approve', url: APP_URL + '/admin/dashboard?tab=listings&approve=' + artwork.sku },
      { text: '❌ Reject', url: APP_URL + '/admin/dashboard?tab=listings&reject=' + artwork.sku },
    ]]
  })
}

export async function notifyPayoutRequest(payout: {
  artistName: string
  amount: number
  bankName: string
  accountName: string
  accountNumber: string
}) {
  const text =
    '💸 <b>Payout request</b>\n\n' +
    '<b>' + payout.artistName + '</b> has requested a payout.\n\n' +
    '💰 Amount: <b>MVR ' + payout.amount.toLocaleString() + '</b>\n\n' +
    '🏦 <b>Bank:</b> ' + payout.bankName + '\n' +
    '👤 <b>Account name:</b> ' + payout.accountName + '\n' +
    '🔢 <b>Account number:</b> <code>' + payout.accountNumber + '</code>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '💸 View payout requests', url: APP_URL + '/admin/dashboard?tab=artists' }
    ]]
  })
}

export async function notifyWithdrawRequest(data: {
  artistName: string
  artistCode: string
  reason: string
}) {
  const text =
    '⚠️ <b>Withdrawal request</b>\n\n' +
    '<b>' + data.artistName + '</b> (FP-' + data.artistCode + ') wants to leave the platform.\n\n' +
    '📝 <b>Reason:</b> ' + data.reason + '\n\n' +
    '<i>Check the admin dashboard — Artists tab.</i>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '👤 View in dashboard', url: APP_URL + '/admin/dashboard?tab=artists' }
    ]]
  })
}

export async function notifyShopStatus(data: {
  artistName: string
  artistCode: string
  status: string
}) {
  const emoji = data.status === 'closed' ? '🔒' : '🟢'
  const text =
    emoji + ' <b>Shop ' + data.status + '</b>\n\n' +
    '<b>' + data.artistName + '</b> (FP-' + data.artistCode + ') has ' +
    (data.status === 'closed' ? 'temporarily closed their shop.' : 'reopened their shop.') +
    '\n\n<i>Check the admin dashboard — Artists tab.</i>'
  await sendTelegram(text, {
    inline_keyboard: [[
      { text: '👤 View in dashboard', url: APP_URL + '/admin/dashboard?tab=artists' }
    ]]
  })
}
