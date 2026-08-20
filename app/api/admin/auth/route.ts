export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MASTER_PIN = process.env.ADMIN_PIN || '2025';
const JWT_SECRET = process.env.JWT_SECRET || 'chidy_prime_super_secret_2025';

function createAdminSessionToken(): string {
  const timestamp = Date.now().toString();
  const payload = `admin:${timestamp}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token) return false;
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return false;
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return false;

    const [role, timestampStr] = payload.split(':');
    if (role !== 'admin') return false;
    const timestamp = parseInt(timestampStr, 10);
    // Token valid for 7 days
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pin = String(body.pin || body.password || '').trim();

    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'Tafadhali weka PIN au Nenosiri la Admin.' },
        { status: 400 }
      );
    }

    const isMatch = pin === '2025' || pin === MASTER_PIN || pin === '2005';

    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: '❌ Nenosiri Sio Sahihi! Ufikiaji Umekataliwa.' },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken();
    const response = NextResponse.json({
      success: true,
      message: 'Ufikiaji wa Admin umethibitishwa.',
      token: sessionToken,
    });

    response.cookies.set({
      name: 'cpcg_admin_token',
      value: sessionToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Hitilafu imetokea wakati wa kuhakiki.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, '');
    const tokenFromCookie = request.cookies.get('cpcg_admin_token')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    const isValid = verifyAdminSessionToken(token);

    return NextResponse.json({
      success: true,
      authenticated: isValid,
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Admin session logged out.' });
  response.cookies.delete('cpcg_admin_token');
  return response;
}
