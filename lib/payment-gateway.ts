import crypto from 'crypto';

export interface RoutePaymentParams {
  amount: number;
  phone: string;
  orderNumber: string;
  description?: string;
  buyerName?: string;
  buyerEmail?: string;
}

export interface RoutePaymentResult {
  gateway: 'pressopay' | 'harakapay' | 'free';
  gatewayReference?: string;
  rawResponse?: any;
  status?: string;
  checkoutUrl?: string;
}

export const DEFAULT_PAYMENT_GATEWAY = 'PRESSOPAY';

const PRESSOPAY_KEY = process.env.PRESSOPAY_API_KEY || process.env.PRESSSO_API_KEY || 'pk_ABUk77pwjZEoLkmA';
const PRESSOPAY_SECRET = process.env.PRESSOPAY_API_SECRET || process.env.PRESSSO_API_SECRET || 'sk_o6_x250mVkQjXFo_sDC2ydYfODErxyo1G0xJEC-A184';
const PRESSOPAY_BASE = process.env.PRESSOPAY_BASE_URL || 'https://pressopay.com';
const HARAKAPAY_API_KEY = process.env.HARAKAPAY_API_KEY || 'hpk_0359eff9eff724d5322d0938d519dd0eb277862480320d83';

/**
 * Sanitize & Normalize Tanzanian Phone Numbers to 255XXXXXXXXX (International Standard)
 */
export function formatTzPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '255' + clean.slice(1);
  } else if (!clean.startsWith('255') && clean.length === 9) {
    clean = '255' + clean;
  }
  return clean;
}

/**
 * Normalizes phone to local format (07XXXXXXXX, 06XXXXXXXX) for display
 */
export function toLocalPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) {
    return '0' + digits.substring(3);
  }
  if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length === 9) {
    return '0' + digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }
  return digits;
}

/**
 * Universal Phone Normalizer (Tanzania standard: 255XXXXXXXXX)
 */
export function cleanPhoneNumber(rawPhone?: string | null): string {
  return formatTzPhone(rawPhone || '');
}

/**
 * Normalizes phone for gateways expecting international 255XXXXXXXXX format
 */
export function toInternationalPhone(rawPhone?: string | null): string {
  return formatTzPhone(rawPhone || '');
}

function generatePressoPaySignature(timestamp: string, nonce: string, method: string, path: string, body: string): string {
  const canonical = [timestamp, nonce, method.toUpperCase(), path, body].join('\n');
  return crypto.createHmac('sha256', PRESSOPAY_SECRET).update(canonical).digest('hex');
}

export function isPressoPayConfigured(): boolean {
  return !!(PRESSOPAY_KEY && PRESSOPAY_SECRET);
}

/**
 * Check payment status directly from PressoPay API
 */
export async function getPressoPayPaymentStatus(reference: string): Promise<any> {
  try {
    const cleanRef = reference.replace(/^PP:/i, '');
    const path = '/api/v1/payments/' + cleanRef;
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    const canonical = [timestamp, nonce, 'GET', path, ''].join('\n');
    const signature = crypto.createHmac('sha256', PRESSOPAY_SECRET).update(canonical).digest('hex');

    const res = await fetch(PRESSOPAY_BASE + path, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-Pressso-Key': PRESSOPAY_KEY,
        'X-Pressso-Timestamp': timestamp,
        'X-Pressso-Nonce': nonce,
        'X-Pressso-Signature': signature,
        'X-Presso-Key': PRESSOPAY_KEY,
        'X-Presso-Timestamp': timestamp,
        'X-Presso-Nonce': nonce,
        'X-Presso-Signature': signature,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[PressoPay Status] Error fetching status:', err);
    return null;
  }
}

/**
 * Normalizes phone to PressoPay format (07XXXXXXXX, 06XXXXXXXX or 255XXXXXXXXX)
 */
export function normalizePressoPayPhone(phone: string): string {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('255')) clean = '0' + clean.substring(3);
  if (!clean.startsWith('0')) clean = '0' + clean;
  return clean;
}

/**
 * Trigger PressoPay Mobile Money Checkout (STK Push)
 */
export async function triggerPressoPayCheckout(params: {
  merchantReference: string;
  amountMinor: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone: string;
  description?: string;
}): Promise<any> {
  const path = '/api/v1/checkouts';
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  const formattedPhone = normalizePressoPayPhone(params.buyerPhone);

  const payload = {
    merchantReference: params.merchantReference,
    amountMinor: Math.round(params.amountMinor),
    buyerName: params.buyerName || 'Mteja wa Mtandaoni',
    buyerEmail: params.buyerEmail || 'customer@chidyprime.com',
    buyerPhone: formattedPhone,
    description: params.description || 'Chidy Prime Game Order',
  };

  const body = JSON.stringify(payload);
  const signature = generatePressoPaySignature(timestamp, nonce, 'POST', path, body);

  const response = await fetch(PRESSOPAY_BASE + path, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'X-Pressso-Key': PRESSOPAY_KEY,
      'X-Pressso-Timestamp': timestamp,
      'X-Pressso-Nonce': nonce,
      'X-Pressso-Signature': signature,
      'X-Presso-Key': PRESSOPAY_KEY,
      'X-Presso-Timestamp': timestamp,
      'X-Presso-Nonce': nonce,
      'X-Presso-Signature': signature,
    },
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[PressoPay] Failed HTTP ${response.status}: ${errorText}`);
    throw new Error(`PressoPay Checkout HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  return await response.json();
}

export function isHarakaPayConfigured(): boolean {
  return !!HARAKAPAY_API_KEY && HARAKAPAY_API_KEY.startsWith('hpk_');
}

/**
 * Trigger HarakaPay Mobile Money USSD Push (https://harakapay.net/api/v1/collect)
 */
export async function triggerHarakaPayCollect(params: {
  phone: string;
  amount: number;
  description?: string;
  webhookUrl?: string;
}): Promise<any> {
  const formattedPhone = normalizePressoPayPhone(params.phone);
  const response = await fetch('https://harakapay.net/api/v1/collect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': HARAKAPAY_API_KEY,
    },
    body: JSON.stringify({
      phone: formattedPhone,
      amount: Math.round(params.amount),
      description: params.description || 'Chidy Prime Game Purchase',
      webhook_url: params.webhookUrl || process.env.HARAKAPAY_WEBHOOK_URL || 'https://chidyprimetz.com/api/webhooks/harakapay',
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `HarakaPay error HTTP ${response.status}`);
  }

  return data;
}

/**
 * Check HarakaPay payment status (https://harakapay.net/api/v1/status/:order_id)
 */
export async function getHarakaPayStatus(orderId: string): Promise<any> {
  try {
    const response = await fetch(`https://harakapay.net/api/v1/status/${orderId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': HARAKAPAY_API_KEY,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('[HarakaPay Status] Error fetching status:', err);
    return null;
  }
}

/**
 * Fast Smart Payment Router (Locked to PressoPay Primary with Failover)
 */
export async function routePayment(params: RoutePaymentParams): Promise<RoutePaymentResult> {
  const { amount, phone, orderNumber, description, buyerName, buyerEmail } = params;

  if (amount <= 0) {
    return {
      gateway: 'free',
      status: 'COMPLETED',
    };
  }

  const formattedPhone = normalizePressoPayPhone(phone);
  const amountMinor = Math.round(amount);

  let lastError: string | null = null;

  // 1. PRIMARY GATEWAY: PressoPay STK Push (Direct Instant Mobile Money Dispatch)
  if (isPressoPayConfigured()) {
    try {
      console.log(`[Payment Gateway] 🚀 Dispatching PressoPay STK Push for ${formattedPhone} (TZS ${amount}) | Order: ${orderNumber}`);
      const pressoRes = await triggerPressoPayCheckout({
        merchantReference: orderNumber,
        amountMinor,
        buyerName,
        buyerEmail,
        buyerPhone: formattedPhone,
        description: description || `Chidy Prime ${orderNumber}`,
      });

      if (pressoRes) {
        return {
          gateway: 'pressopay',
          gatewayReference: pressoRes.reference || pressoRes.id || orderNumber,
          rawResponse: pressoRes,
          status: pressoRes.status || 'PENDING',
          checkoutUrl: pressoRes.checkoutUrl,
        };
      }
    } catch (pressoErr: any) {
      lastError = pressoErr?.message || 'PressoPay gateway error';
      console.warn('[Payment Gateway] ⚠️ PressoPay primary attempt error:', pressoErr?.message);
    }
  }

  // 2. SECONDARY / FAILOVER: HarakaPay (Only if PressoPay fails or unconfigured)
  if (isHarakaPayConfigured()) {
    try {
      console.log(`[Payment Gateway] 🔄 Failover to HarakaPay USSD Push for ${formattedPhone} (TZS ${amount})`);
      const harakaRes = await triggerHarakaPayCollect({
        phone: formattedPhone,
        amount,
        description: description || `Chidy Prime ${orderNumber}`,
      });

      if (harakaRes.success && harakaRes.order_id) {
        return {
          gateway: 'harakapay',
          gatewayReference: harakaRes.order_id,
          rawResponse: harakaRes,
          status: 'PENDING',
        };
      }
    } catch (harakaErr: any) {
      lastError = harakaErr?.message || 'HarakaPay error';
      console.warn('[Payment Gateway] ⚠️ HarakaPay failover error:', harakaErr?.message);
    }
  }

  return {
    gateway: 'pressopay',
    gatewayReference: orderNumber,
    rawResponse: { error: lastError || 'Gateway response pending' },
    status: 'PENDING',
  };
}
