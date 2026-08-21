export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { GET as getStatus, POST as postStatus } from '@/app/api/checkout/status/route';

export async function GET(request: NextRequest) {
  return getStatus(request);
}

export async function POST(request: NextRequest) {
  return postStatus(request);
}
