import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/payment-gateway';

export async function GET() {
  try {
    const supabase = createAdminClient();

    let profiles: any[] = [];
    try {
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      profiles = pData || [];
    } catch {}

    let xxUsers: any[] = [];
    try {
      const { data: xData } = await supabase
        .from('xx_users')
        .select('*')
        .order('created_at', { ascending: false });
      xxUsers = xData || [];
    } catch {}

    let orders: any[] = [];
    try {
      const { data: oData } = await supabase
        .from('orders')
        .select('id, visitor_phone, phone_number, customer_name, amount, status, payment_status, created_at');
      orders = oData || [];
    } catch {}

    let paymentOrders: any[] = [];
    try {
      const { data: poData } = await supabase
        .from('payment_orders')
        .select('id, phone_number, visitor_phone, amount, status, created_at');
      paymentOrders = poData || [];
    } catch {}

    const allOrdersList = [
      ...orders.map((o) => ({
        phone: cleanPhoneNumber(o.visitor_phone || o.phone_number || ''),
        name: o.customer_name || '',
        amount: Number(o.amount) || 0,
        status: o.status || o.payment_status || '',
        created_at: o.created_at,
      })),
      ...paymentOrders.map((po) => ({
        phone: cleanPhoneNumber(po.phone_number || po.visitor_phone || ''),
        name: '',
        amount: Number(po.amount) || 0,
        status: po.status || '',
        created_at: po.created_at,
      })),
    ].filter((o) => o.phone && o.phone.length >= 8);

    const phoneStatsMap = new Map<string, { totalOrders: number; totalSpent: number; lastActive: string; name: string }>();
    allOrdersList.forEach((o) => {
      const existing = phoneStatsMap.get(o.phone) || { totalOrders: 0, totalSpent: 0, lastActive: o.created_at, name: o.name };
      existing.totalOrders += 1;
      if (['approved', 'completed', 'paid'].includes((o.status || '').toLowerCase())) {
        existing.totalSpent += o.amount;
      }
      if (o.name && !existing.name) existing.name = o.name;
      if (new Date(o.created_at) > new Date(existing.lastActive || 0)) {
        existing.lastActive = o.created_at;
      }
      phoneStatsMap.set(o.phone, existing);
    });

    const userMap = new Map<string, any>();

    profiles.forEach((p) => {
      const cleanPhone = cleanPhoneNumber(p.phone_number || p.phone || '');
      const key = cleanPhone || p.id || p.email;
      const orderStats = cleanPhone ? phoneStatsMap.get(cleanPhone) : null;
      userMap.set(key, {
        id: p.id,
        email: p.email || (cleanPhone ? `${cleanPhone}@customer.chidy` : 'mteja@chidy.com'),
        full_name: p.full_name || p.name || orderStats?.name || 'Mteja wa Mtandaoni',
        phone_number: cleanPhone || p.phone_number || 'N/A',
        role: p.role || 'user',
        status: p.status || 'active',
        created_at: p.created_at,
        last_sign_in_at: p.last_sign_in_at || orderStats?.lastActive || p.created_at,
        orders_count: orderStats?.totalOrders || 0,
        total_spent: orderStats?.totalSpent || 0,
      });
    });

    xxUsers.forEach((x) => {
      const cleanPhone = cleanPhoneNumber(x.phone || '');
      const key = cleanPhone || x.id;
      if (!userMap.has(key)) {
        const orderStats = cleanPhone ? phoneStatsMap.get(cleanPhone) : null;
        userMap.set(key, {
          id: x.id || `usr_${cleanPhone}`,
          email: x.email || `${cleanPhone}@customer.chidy`,
          full_name: x.name || orderStats?.name || 'Mteja Aliyesajiliwa',
          phone_number: cleanPhone,
          role: x.role || 'user',
          status: 'active',
          created_at: x.created_at || new Date().toISOString(),
          last_sign_in_at: orderStats?.lastActive || x.created_at,
          orders_count: orderStats?.totalOrders || 0,
          total_spent: orderStats?.totalSpent || 0,
        });
      }
    });

    phoneStatsMap.forEach((stats, phone) => {
      if (!userMap.has(phone)) {
        userMap.set(phone, {
          id: `buyer_${phone}`,
          email: `${phone}@customer.chidy`,
          full_name: stats.name || `Mteja (${phone.slice(-4)})`,
          phone_number: phone,
          role: 'user',
          status: 'active',
          created_at: stats.lastActive || new Date().toISOString(),
          last_sign_in_at: stats.lastActive,
          orders_count: stats.totalOrders,
          total_spent: stats.totalSpent,
        });
      }
    });

    const userList = Array.from(userMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      users: userList,
      count: userList.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, status } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Valid userId is required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (role && ['user', 'admin'].includes(role)) {
      updates.role = role;
    }
    if (status && ['active', 'archived'].includes(status)) {
      updates.status = status;
    }

    const supabase = createAdminClient();
    try {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
    } catch {}

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
