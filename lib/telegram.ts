const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7417066922:AAEqqX3f59X_NfZS9a-dK9E_Jm9kY6zB-bM';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1002234567890';

export async function sendTelegramAlert(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTelegramOrderNotification(data: {
  order_number: string;
  visitor_phone: string;
  game_title: string;
  amount: number;
  payment_gateway: string;
  activation_key?: string;
}): Promise<boolean> {
  const msg = [
    `🛒 <b>NEW ORDER INITIATED</b>`,
    `<b>Order:</b> <code>${data.order_number}</code>`,
    `<b>Product:</b> ${data.game_title}`,
    `<b>Amount:</b> TZS ${data.amount.toLocaleString()}`,
    `<b>Phone:</b> <code>${data.visitor_phone}</code>`,
    `<b>Gateway:</b> ${data.payment_gateway}`,
    data.activation_key ? `<b>Key:</b> <code>${data.activation_key}</code>` : '',
  ].filter(Boolean).join('\n');

  return sendTelegramAlert(msg);
}

export async function notifySuccessfulPayment(data: {
  id?: string;
  order_number: string;
  amount: number;
  game_title: string;
  visitor_phone: string;
  payment_gateway?: string;
}): Promise<boolean> {
  const msg = [
    `💰 <b>PAYMENT CONFIRMED & UNLOCKED!</b> 🎉`,
    `<b>Order:</b> <code>${data.order_number}</code>`,
    `<b>Product:</b> ${data.game_title}`,
    `<b>Amount:</b> TZS ${Number(data.amount || 0).toLocaleString()}`,
    `<b>Customer:</b> <code>${data.visitor_phone}</code>`,
    `<b>Gateway:</b> ${data.payment_gateway || 'PRESSOPAY'}`,
    `<b>Status:</b> ✅ ACCESS ACTIVE`,
  ].join('\n');

  return sendTelegramAlert(msg);
}
