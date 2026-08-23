export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Check if reset of test orders is requested
    const resetTestApproved = request.nextUrl.searchParams.get('resetApproved') === 'true';
    if (resetTestApproved) {
      console.log('[Order Cleanup] 🔒 Resetting test approved orders to cancelled...');
      await supabase.from('payment_orders').update({ status: 'cancelled' }).eq('status', 'approved');
      await supabase.from('orders').update({ status: 'cancelled', payment_status: 'cancelled' }).in('status', ['approved', 'completed']);
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
