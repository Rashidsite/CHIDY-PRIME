export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { GET as getOrderStatus } from '@/app/api/orders/status/route';

export async function GET(request: NextRequest) {
  return getOrderStatus(request);
}
