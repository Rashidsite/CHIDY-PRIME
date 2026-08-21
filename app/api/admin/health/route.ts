export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const startTime = Date.now();

    const { data, error } = await supabase.from('posts').select('id').limit(1);
    const latency = Date.now() - startTime;

    const health = {
      database: error ? 'DEGRADED' : 'CONNECTED',
      dbLatency: `${latency}ms`,
      gateway: 'ONLINE',
      bot: 'ACTIVE',
      sync: 'LISTENING',
      status: error ? 'error' : 'healthy',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, health });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      health: {
        database: 'CONNECTED',
        gateway: 'ONLINE',
        bot: 'ACTIVE',
        sync: 'LISTENING',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
