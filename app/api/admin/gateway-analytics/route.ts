export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: poData } = await supabase
      .from('payment_orders')
      .select('id, amount, status, promo_used, created_at');

    let pressopayVol = 0;
    let pressopayTx = 0;
    let harakapayVol = 0;
    let harakapayTx = 0;

    (poData || []).forEach((o: any) => {
      const isPaid = ['approved', 'completed', 'paid'].includes((o.status || '').toLowerCase());
      const amt = Number(o.amount) || 0;
      const promo = String(o.promo_used || '').toLowerCase();

      if (promo.includes('hp:') || promo.includes('haraka')) {
        harakapayTx += 1;
        if (isPaid) harakapayVol += amt;
      } else {
        pressopayTx += 1;
        if (isPaid) pressopayVol += amt;
      }
    });

    const totalVol = pressopayVol + harakapayVol;
    const pressoShare = totalVol > 0 ? Math.round((pressopayVol / totalVol) * 100) : (pressopayTx > 0 ? 100 : 0);
    const harakaShare = totalVol > 0 ? Math.round((harakapayVol / totalVol) * 100) : 0;

    const data = {
      pressopay: {
        health: true,
        sharePercent: pressoShare,
        volume: pressopayVol,
        transactions: pressopayTx,
      },
      harakapay: {
        health: true,
        sharePercent: harakaShare,
        volume: harakapayVol,
        transactions: harakapayTx,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
