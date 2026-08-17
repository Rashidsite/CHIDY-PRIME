import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Order Cleanup] 🧹 Purging unfulfilled orders created before: ${cutoffDate}`);

    const { data: staleOrders, error: queryErr } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, created_at')
      .lt('created_at', cutoffDate)
      .in('status', ['pending', 'rejected', 'failed', 'cancelled'])
      .neq('payment_status', 'completed');

    if (queryErr) {
      console.error('[Order Cleanup] ❌ Query error:', queryErr);
      return NextResponse.json({ success: false, error: queryErr.message }, { status: 500 });
    }

    const orderIds = (staleOrders || []).map((o) => o.id);
    let deletedCount = 0;

    if (orderIds.length > 0) {
      const { error: deleteErr, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .in('id', orderIds);

      if (deleteErr) {
        console.error('[Order Cleanup] ❌ Delete error:', deleteErr);
        return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
      }

      deletedCount = count || orderIds.length;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Usafishaji umekamilika! Jumla ya oda ${deletedCount} za zamani (zaidi ya masaa 24) zilizokuwa pending/rejected zimefutwa. Data za umiliki wa wateja (user_purchases) zimehifadhiwa salama 100%.`,
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
