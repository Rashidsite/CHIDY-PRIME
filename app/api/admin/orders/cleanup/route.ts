import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Order Cleanup] 🧹 Purging unfulfilled orders created before: ${cutoffDate}`);

    let totalDeleted = 0;
    const errors: string[] = [];

    // 1. Try cleaning from 'orders' table if it exists
    try {
      const { data: staleOrders, error: queryErr } = await supabase
        .from('orders')
        .select('id, status, payment_status, created_at')
        .lt('created_at', cutoffDate)
        .in('status', ['pending', 'rejected', 'failed', 'cancelled'])
        .neq('payment_status', 'completed');

      if (!queryErr && staleOrders && staleOrders.length > 0) {
        const orderIds = staleOrders.map((o) => o.id);
        const { error: deleteErr, count } = await supabase
          .from('orders')
          .delete({ count: 'exact' })
          .in('id', orderIds);

        if (!deleteErr) {
          totalDeleted += count || orderIds.length;
        }
      }
    } catch (err: any) {
      console.warn('[Order Cleanup] Note: orders table cleanup skipped:', err?.message);
    }

    // 2. Clean from 'payment_orders' table (which holds legacy and live store orders)
    try {
      const { data: staleLegacy, error: legacyQueryErr } = await supabase
        .from('payment_orders')
        .select('id, status, created_at')
        .lt('created_at', cutoffDate)
        .in('status', ['pending', 'rejected', 'failed', 'cancelled']);

      if (!legacyQueryErr && staleLegacy && staleLegacy.length > 0) {
        const legacyIds = staleLegacy.map((o) => o.id);
        const { error: legacyDeleteErr, count: legacyCount } = await supabase
          .from('payment_orders')
          .delete({ count: 'exact' })
          .in('id', legacyIds);

        if (!legacyDeleteErr) {
          totalDeleted += legacyCount || legacyIds.length;
        } else {
          console.error('[Order Cleanup] ❌ payment_orders delete error:', legacyDeleteErr);
          errors.push(legacyDeleteErr.message);
        }
      }
    } catch (err: any) {
      console.error('[Order Cleanup] ❌ payment_orders error:', err);
      errors.push(err?.message || 'payment_orders error');
    }

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Usafishaji umekamilika! Jumla ya oda ${totalDeleted} za zamani (zaidi ya masaa 24) zilizokuwa pending/rejected zimefutwa. Data za umiliki wa wateja na oda zilizoidhinishwa zimehifadhiwa salama 100%.`,
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
