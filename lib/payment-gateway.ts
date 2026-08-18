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

const PRESSOPAY_KEY = process.env.PRESSOPAY_API_KEY || 'pk_IlU-qGhdV5H-sGj7';
const PRESSOPAY_SECRET = process.env.PRESSOPAY_API_SECRET || 'sk_Z-H-BqAmcxOwKOFqaBfSgYsZT9KMBgYDpHeEQHKJT-w';
const PRESSOPAY_BASE = process.env.PRESSOPAY_BASE_URL || 'https://pressopay.com';
const HARAKAPAY_API_KEY = process.env.HARAKAPAY_API_KEY || 'hpk_83c505af729a5f9059ef8ea1c6b125e6831adf232da6e387';

/**
 * Universal Phone Normalizer (Tanzania formats: 07XXXXXXXX, 06XXXXXXXX, 255XXXXXXXXX)
 */
export function cleanPhoneNumber(rawPhone?: string | null): string {
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
 * Normalizes phone for gateways expecting international 255XXXXXXXXX format
 */
export function toInternationalPhone(rawPhone?: string | null): string {
  const local = cleanPhoneNumber(rawPhone);
  if (local.startsWith('0') && local.length === 10) {
    return '255' + local.substring(1);
  }
  return local;
}

function generatePressoPaySignature(timestamp: string, nonce: string, method: string, path: string, body: string): string {
  const canonical = [timestamp, nonce, method.toUpperCase(), path, body].join('\n');
  return crypto.createHmac('sha256', PRESSOPAY_SECRET).update(canonical).digest('hex');
}

export function isPressoPayConfigured(): boolean {
  return !!(PRESSOPAY_KEY && PRESSOPAY_SECRET);
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

  const formattedPhone = cleanPhoneNumber(params.buyerPhone);

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
    },
    body,
    signal: AbortSignal.timeout(6500),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
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

  const cleanedPhone = cleanPhoneNumber(phone);
  const amountMinor = Math.round(amount);

  // 1. Try PressoPay Primary
  if (isPressoPayConfigured()) {
    try {
      console.log(`[Payment Gateway] 🚀 Initiating PressoPay STK Push for ${cleanedPhone} (TZS ${amount})`);
      const pressoRes = await triggerPressoPayCheckout({
        merchantReference: orderNumber,
        amountMinor,
        buyerName,
        buyerEmail,
        buyerPhone: cleanedPhone,
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
      console.warn('[Payment Gateway] ⚠️ PressoPay attempt error:', pressoErr?.message);
    }
  }

  // 2. Try HarakaPay Fallback if configured
  if (HARAKAPAY_API_KEY) {
    try {
      console.log(`[Payment Gateway] 🔄 Fallback to HarakaPay for ${cleanedPhone}`);
      const harakaRes = await fetch('https://api.harakapay.com/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HARAKAPAY_API_KEY}`,
        },
        body: JSON.stringify({
          amount,
          phone: cleanedPhone,
          order_id: orderNumber,
          customer_name: buyerName || 'Customer',
        }),
        signal: AbortSignal.timeout(6500),
      });

      if (harakaRes.ok) {
        const hData = await harakaRes.json();
        return {
          gateway: 'harakapay',
          gatewayReference: hData.reference || hData.id || orderNumber,
          rawResponse: hData,
          status: hData.status || 'PENDING',
        };
      }
    } catch (harakaErr: any) {
      console.warn('[Payment Gateway] ⚠️ HarakaPay attempt error:', harakaErr?.message);
    }
  }

  return {
    gateway: 'pressopay',
    gatewayReference: orderNumber,
    rawResponse: { error: 'Gateway response pending' },
    status: 'PENDING',
  };
}
