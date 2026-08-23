export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let totalDeleted = 0;

    // 1. Delete stale pending/rejected/cancelled/failed orders older than 24 hours from payment_orders
    const { data: delPaymentOrders, error: err1 } = await supabase
      .from('payment_orders')
      .delete()
      .lt('created_at', cutoffDate)
      .in('status', ['pending', 'rejected', 'cancelled', 'failed'])
      .select('id');

    if (!err1 && delPaymentOrders) {
      totalDeleted += delPaymentOrders.length;
    }

    // 2. Delete stale uncompleted orders older than 24 hours from fallback orders table
    const { data: delOrders, error: err2 } = await supabase
      .from('orders')
      .delete()
      .lt('created_at', cutoffDate)
      .in('status', ['pending', 'rejected', 'cancelled', 'failed'])
      .select('id');

    if (!err2 && delOrders) {
      totalDeleted += delOrders.length;
    }

    // 3. Delete from xx_orders table if present
    try {
      await supabase
        .from('xx_orders')
        .delete()
        .lt('created_at', cutoffDate)
        .in('status', ['pending', 'rejected', 'cancelled', 'failed']);
    } catch {}

    console.log(`[Order Cleanup 🧹] Successfully deleted ${totalDeleted} stale uncompleted orders older than ${cutoffDate}`);

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Usafishaji umekamilika! Jumla ya oda ${totalDeleted} za zamani (zaidi ya masaa 24) ambazo hazikulipwa zimefutwa. Oda zilizoidhinishwa (Approved) na umiliki wa wateja zimebaki salama 100%.`,
      cutoffDate,
    });
  } catch (error: any) {
    console.error('[Order Cleanup] 💥 Fatal Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Hitilafu imetokea wakati wa kusafisha oda.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
