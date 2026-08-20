export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { GET as getCheckoutStatus } from '@/app/api/checkout/status/route';

export async function GET(request: NextRequest) {
  return getCheckoutStatus(request);
}
