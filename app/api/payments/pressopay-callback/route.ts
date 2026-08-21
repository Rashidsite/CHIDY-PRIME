export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { POST as postWebhook, GET as getWebhook } from '@/app/api/webhooks/pressopay/route';

export async function POST(request: NextRequest) {
  return postWebhook(request);
}

export async function GET(request: NextRequest) {
  return getWebhook(request);
}
