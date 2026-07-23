// ============================================================
// PRESSOPAY PAYMENT INTEGRATION — Chidy Prime
// HMAC-SHA256 signed REST client for pressopay.com
// ============================================================

const { createHmac, randomUUID } = require('crypto');

const PRESSOPAY_KEY    = process.env.PRESSOPAY_API_KEY    || '';
const PRESSOPAY_SECRET = process.env.PRESSOPAY_API_SECRET || '';
const PRESSOPAY_BASE   = process.env.PRESSOPAY_BASE_URL   || 'https://pressopay.com';

// ══════════════════════════════════════════════════════════
// 1. HMAC-SHA256 SIGNATURE GENERATION
// Canonical string: timestamp\nnonce\nMETHOD\npath\nbody
// ══════════════════════════════════════════════════════════
function generateSignature(timestamp, nonce, method, path, body) {
    const canonical = [timestamp, nonce, method.toUpperCase(), path, body].join('\n');
    return createHmac('sha256', PRESSOPAY_SECRET).update(canonical).digest('hex');
}

function isConfigured() {
    return !!(PRESSOPAY_KEY && PRESSOPAY_SECRET);
}

// ══════════════════════════════════════════════════════════
// 2. NORMALIZE PHONE (Tanzania)
// ══════════════════════════════════════════════════════════
// PressoPay expects local 10-digit format: 0XXXXXXXXX
function normalizePhoneNumber(phone) {
    let clean = String(phone).replace(/\D/g, '');
    if (clean.startsWith('255')) clean = '0' + clean.substring(3);
    if (!clean.startsWith('0'))  clean = '0' + clean;

    if (clean.length !== 10) throw new Error('Namba ya simu si sahihi. Tumia mfano: 0712345678');
    if (!clean.startsWith('06') && !clean.startsWith('07')) {
        throw new Error('Namba ya simu lazima ianze na 06 au 07');
    }
    return clean;
}

// ══════════════════════════════════════════════════════════
// 3. CREATE CHECKOUT (STK PUSH)
// ══════════════════════════════════════════════════════════
async function createCheckout(params) {
    if (!isConfigured()) throw new Error('PressoPay haijawekwa (missing API keys)');

    const {
        merchantReference,
        amountMinor,
        buyerName,
        buyerEmail = 'customer@chidyprime.com',
        buyerPhone,
        description = 'Chidy Prime Premium Access'
    } = params;

    const path = '/api/v1/checkouts';
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();
    const idempotencyKey = randomUUID();

    const body = JSON.stringify({
        merchantReference,
        amountMinor,
        buyerName,
        buyerEmail,
        buyerPhone,
        description
    });

    const signature = generateSignature(timestamp, nonce, 'POST', path, body);

    const startTime = Date.now();
    const response = await fetch(PRESSOPAY_BASE + path, {
        method: 'POST',
        headers: {
            'content-type':          'application/json',
            'idempotency-key':       idempotencyKey,
            'X-Pressso-Key':         PRESSOPAY_KEY,
            'X-Pressso-Timestamp':   timestamp,
            'X-Pressso-Nonce':       nonce,
            'X-Pressso-Signature':   signature
        },
        body,
        signal: AbortSignal.timeout(15000)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`PressoPay checkout failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[PressoPay] checkout OK: ${data.reference} (${responseTime}ms)`);

    return {
        success: true,
        reference: data.reference,
        merchantReference: data.merchantReference,
        status: data.status,          // PENDING | COMPLETED | FAILED | CANCELLED
        checkoutUrl: data.checkoutUrl,
        responseTime
    };
}

// ══════════════════════════════════════════════════════════
// 4. CHECK PAYMENT STATUS
// ══════════════════════════════════════════════════════════
async function checkPaymentStatus(reference) {
    if (!isConfigured()) throw new Error('PressoPay haijawekwa (missing API keys)');
    if (!reference) throw new Error('Reference inahitajika');

    const path = `/api/v1/payments/${reference}`;
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();

    const signature = generateSignature(timestamp, nonce, 'GET', path, '');

    const startTime = Date.now();
    const response = await fetch(PRESSOPAY_BASE + path, {
        method: 'GET',
        headers: {
            'X-Pressso-Key':       PRESSOPAY_KEY,
            'X-Pressso-Timestamp': timestamp,
            'X-Pressso-Nonce':     nonce,
            'X-Pressso-Signature': signature
        },
        signal: AbortSignal.timeout(10000)
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
        success: true,
        status: data.status,
        reference: data.reference,
        merchantReference: data.merchantReference,
        amountMinor: data.amountMinor,
        completedAt: data.completedAt,
        responseTime
    };
}

// ══════════════════════════════════════════════════════════
// 5. VERIFY INCOMING WEBHOOK SIGNATURE
// ══════════════════════════════════════════════════════════
// Callback headers mirror the request-side scheme.
function verifyWebhookSignature(headers, rawBody, path = '/api/payments/pressopay-callback') {
    if (!PRESSOPAY_SECRET) return false;
    const timestamp = headers['x-pressso-timestamp'] || headers['X-Pressso-Timestamp'];
    const nonce     = headers['x-pressso-nonce']     || headers['X-Pressso-Nonce'];
    const provided  = headers['x-pressso-signature'] || headers['X-Pressso-Signature'];
    if (!timestamp || !nonce || !provided) return false;

    const expected = generateSignature(timestamp, nonce, 'POST', path, rawBody || '');
    // Constant-time compare
    if (expected.length !== provided.length) return false;
    let out = 0;
    for (let i = 0; i < expected.length; i++) out |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    return out === 0;
}

// ══════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════
module.exports = {
    createCheckout,
    checkPaymentStatus,
    normalizePhoneNumber,
    verifyWebhookSignature,
    isConfigured,
    PRESSOPAY_KEY,
    PRESSOPAY_BASE
};
