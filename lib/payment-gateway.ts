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

const PRESSOPAY_KEY = process.env.PRESSSO_API_KEY || process.env.PRESSOPAY_API_KEY || 'pk_ABUk77pwjZEoLkmA';
const PRESSOPAY_SECRET = process.env.PRESSSO_API_SECRET || process.env.PRESSOPAY_API_SECRET || 'sk_o6_x250mVkQjXFo_sDC2ydYfODErxyo1G0xJEC-A184';
const PRESSOPAY_BASE = process.env.PRESSOPAY_BASE_URL || 'https://pressopay.com';
const HARAKAPAY_API_KEY = process.env.HARAKAPAY_API_KEY || 'hpk_83c505af729a5f9059ef8ea1c6b125e6831adf232da6e387';

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
    const path = '/api/v1/payments/' + reference;
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    const canonical = [timestamp, nonce, 'GET', path, ''].join('\n');
    const signature = crypto.createHmac('sha256', PRESSOPAY_SECRET).update(canonical).digest('hex');

    const res = await fetch(PRESSOPAY_BASE + path, {
      method: 'GET',
      headers: {
        'X-Pressso-Key': PRESSOPAY_KEY,
        'X-Pressso-Timestamp': timestamp,
        'X-Pressso-Nonce': nonce,
        'X-Pressso-Signature': signature,
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

  const formattedPhone = formatTzPhone(params.buyerPhone);

  const payload = {
    merchantReference: params.merchantReference,
    amountMinor: params.amountMinor,
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
      'User-Agent': 'ChidyPrime/2.0 (Mobile Payment Engine)',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'idempotency-key': idempotencyKey,
      'X-Pressso-Key': PRESSOPAY_KEY,
      'X-Pressso-Timestamp': timestamp,
      'X-Pressso-Nonce': nonce,
      'X-Pressso-Signature': signature,
      'X-Presso-Key': PRESSOPAY_KEY,
      'X-Presso-Timestamp': timestamp,
      'X-Presso-Nonce': nonce,
      'X-Presso-Signature': signature,
      'Authorization': `Bearer ${PRESSOPAY_SECRET}`,
    },
    body,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[PressoPay] Failed HTTP ${response.status}: ${errorText}`);
    throw new Error(`PressoPay Checkout HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  return await response.json();
}

/**
 * Fast Smart Payment Router (Executes PressoPay STK Push with HarakaPay fallback)
 */
export async function routePayment(params: RoutePaymentParams): Promise<RoutePaymentResult> {
  const { amount, phone, orderNumber, description, buyerName, buyerEmail } = params;

  if (amount <= 0) {
    return {
      gateway: 'free',
      status: 'COMPLETED',
    };
  }

  const formattedPhone = formatTzPhone(phone);
  const amountMinor = Math.round(amount);

  let lastError: string | null = null;

  // 1. Try PressoPay Primary
  if (isPressoPayConfigured()) {
    try {
      console.log(`[Payment Gateway] 🚀 Initiating PressoPay STK Push for ${formattedPhone} (TZS ${amount})`);
      const pressoRes = await triggerPressoPayCheckout({
        merchantReference: orderNumber,
        amountMinor,
        buyerName,
        buyerEmail,
        buyerPhone: formattedPhone,
        description: description || `Chidy Prime ${orderNumber}`,
      });

      return {
        gateway: 'pressopay',
        gatewayReference: pressoRes.reference || pressoRes.id || orderNumber,
        rawResponse: pressoRes,
        status: pressoRes.status || 'PENDING',
        checkoutUrl: pressoRes.checkoutUrl,
      };
    } catch (pressoErr: any) {
      lastError = pressoErr?.message || 'PressoPay gateway error';
      console.warn('[Payment Gateway] ⚠️ PressoPay attempt error:', pressoErr?.message);
    }
  }

  // 2. Try HarakaPay Fallback if configured
  if (HARAKAPAY_API_KEY) {
    try {
      console.log(`[Payment Gateway] 🔄 Fallback to HarakaPay for ${formattedPhone}`);
      const harakaRes = await fetch('https://api.harakapay.com/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HARAKAPAY_API_KEY}`,
        },
        body: JSON.stringify({
          amount,
          phone: formattedPhone,
          order_id: orderNumber,
          customer_name: buyerName || 'Customer',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (harakaRes.ok) {
        const hData = await harakaRes.json();
        return {
          gateway: 'harakapay',
          gatewayReference: hData.reference || hData.id || orderNumber,
          rawResponse: hData,
          status: hData.status || 'PENDING',
        };
      } else {
        const errText = await harakaRes.text().catch(() => 'Unknown error');
        lastError = `HarakaPay HTTP ${harakaRes.status}: ${errText}`;
        console.warn(`[HarakaPay] Error HTTP ${harakaRes.status}: ${errText.substring(0, 200)}`);
      }
    } catch (harakaErr: any) {
      lastError = harakaErr?.message || 'HarakaPay error';
      console.warn('[Payment Gateway] ⚠️ HarakaPay attempt error:', harakaErr?.message);
    }
  }

  return {
    gateway: 'pressopay',
    gatewayReference: orderNumber,
    rawResponse: { error: lastError || 'Gateway response pending' },
    status: 'PENDING',
  };
}
