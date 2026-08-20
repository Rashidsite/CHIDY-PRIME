export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Normalize any phone format → 255XXXXXXXXX
function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '255' + digits.slice(1);
  if (digits.length === 9) return '255' + digits;
  return digits;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // ── Fetch payment_orders with phone + amount ─────────────────────────────
    const { data: paymentOrders } = await supabase
      .from('payment_orders')
      .select('id, phone_number, amount, status, created_at, visitor_id, post_id, promo_used, posts(title), visitors(name, phone)');

    // ── Fetch xx_users for access data ──────────────────────────────────────
    const { data: xxUsers } = await supabase
      .from('xx_users')
      .select('*')
      .order('created_at', { ascending: false });

    // ── Build phone → stats map from payment_orders ──────────────────────────
    const phoneStatsMap = new Map<string, {
      totalOrders: number;
      totalSpent: number;
      lastActive: string;
      name: string;
      productTitles: string[];
    }>();

    (paymentOrders || []).forEach((o: any) => {
      // Normalize the phone — payment_orders may store any format
      const rawPhone = o.phone_number || o.visitors?.phone || '';
      const phone = normalizePhone(rawPhone);
      if (!phone || phone.length < 9) return;

      const existing = phoneStatsMap.get(phone) || {
        totalOrders: 0,
        totalSpent: 0,
        lastActive: o.created_at,
        name: o.visitors?.name || '',
        productTitles: [],
      };

      existing.totalOrders += 1;

      // Count amount for approved/completed orders only
      if (['approved', 'completed', 'paid'].includes((o.status || '').toLowerCase())) {
        existing.totalSpent += Number(o.amount) || 0;
      }

      if (!existing.name && o.visitors?.name) existing.name = o.visitors.name;

      if (o.created_at && new Date(o.created_at) > new Date(existing.lastActive || 0)) {
        existing.lastActive = o.created_at;
      }

      if (o.posts?.title && !existing.productTitles.includes(o.posts.title)) {
        existing.productTitles.push(o.posts.title);
      }

      phoneStatsMap.set(phone, existing);
    });

    // ── Also include phone formats from visitors ─────────────────────────────
    // (some visitors have "0XXXXXXXXX" format, normalize and merge)
    (paymentOrders || []).forEach((o: any) => {
      const visPhone = normalizePhone(o.visitors?.phone || '');
      const rawPhone = normalizePhone(o.phone_number || '');

      if (visPhone && visPhone !== rawPhone && phoneStatsMap.has(rawPhone)) {
        // Merge visitor phone into same stats
        const stats = phoneStatsMap.get(rawPhone)!;
        if (!phoneStatsMap.has(visPhone)) {
          phoneStatsMap.set(visPhone, stats);
        }
      }
    });

    // ── Build user list from xx_users (primary source of registered users) ───
    const userMap = new Map<string, any>();

    (xxUsers || []).forEach((x: any) => {
      const phone = normalizePhone(x.phone || '');
      const key = phone || String(x.id);
      const stats = phone ? phoneStatsMap.get(phone) : null;

      userMap.set(key, {
        id: x.id || `usr_${phone}`,
        email: `${phone || key}@customer.chidy`,
        full_name: x.name || stats?.name || `Mteja (${phone?.slice(-4) || '???'})`,
        phone_number: phone || x.phone || 'N/A',
        role: 'user',
        status: 'active',
        created_at: x.created_at || new Date().toISOString(),
        last_sign_in_at: stats?.lastActive || x.created_at,
        orders_count: stats?.totalOrders || 0,
        total_spent: stats?.totalSpent || 0,
        access_until: x.access_until || null,
        products_purchased: stats?.productTitles || [],
      });
    });

    // ── Also add buyers who appear in payment_orders but NOT in xx_users ─────
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
          access_until: null,
          products_purchased: stats.productTitles,
        });
      }
    });

    const userList = Array.from(userMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, users: userList, count: userList.length });
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
    if (role && ['user', 'admin'].includes(role)) updates.role = role;
    if (status && ['active', 'archived'].includes(status)) updates.status = status;

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
