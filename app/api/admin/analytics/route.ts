export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function safeNumber(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function isOrderPaid(order: any): boolean {
  const status = (order?.status || '').toLowerCase();
  const paymentStatus = (order?.payment_status || '').toLowerCase();
  return ['approved', 'completed', 'paid', 'success', 'successful'].includes(status) ||
         ['completed', 'success', 'successful', 'paid'].includes(paymentStatus);
}

function isOrderPending(order: any): boolean {
  const status = (order?.status || '').toLowerCase();
  const paymentStatus = (order?.payment_status || '').toLowerCase();
  return status === 'pending' || paymentStatus === 'pending' || (!status && !paymentStatus);
}

function isOrderFailed(order: any): boolean {
  const status = (order?.status || '').toLowerCase();
  const paymentStatus = (order?.payment_status || '').toLowerCase();
  return ['rejected', 'cancelled', 'failed', 'trashed'].includes(status) ||
         ['failed', 'rejected', 'cancelled'].includes(paymentStatus);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7days';

    const supabase = createAdminClient();

    // 1. Fetch Real Products from 'posts' table
    let totalProducts = 0;
    const { data: postsList, count: postsCount } = await supabase
      .from('posts')
      .select('id, title, category, price, views', { count: 'exact' });
    
    totalProducts = postsCount || (postsList ? postsList.length : 0);

    // 2. Fetch Orders from 'payment_orders' and 'orders' tables
    let allOrders: any[] = [];
    const seenOrderIds = new Set<string>();

    try {
      const { data: poData } = await supabase
        .from('payment_orders')
        .select('id, amount, status, created_at, post_id, phone_number, promo_used, posts(id, title, category, price)')
        .order('created_at', { ascending: false });

      if (poData && Array.isArray(poData)) {
        poData.forEach((po: any) => {
          const id = String(po.id);
          if (!seenOrderIds.has(id)) {
            seenOrderIds.add(id);
            allOrders.push({
              id,
              order_number: po.promo_used?.split('|')[0] || `PO-${id}`,
              amount: Number(po.amount) || Number(po.posts?.price) || 0,
              status: po.status || 'pending',
              payment_status: po.status || 'pending',
              created_at: po.created_at || new Date().toISOString(),
              product_id: po.post_id || po.posts?.id,
              game_title: po.posts?.title || 'Game / Mod',
              category: po.posts?.category || 'General',
            });
          }
        });
      }
    } catch (e) {}

    try {
      const { data: oData } = await supabase
        .from('orders')
        .select('id, order_number, amount, status, payment_status, created_at, product_id, game_id, game_title')
        .order('created_at', { ascending: false });

      if (oData && Array.isArray(oData)) {
        oData.forEach((o: any) => {
          const id = String(o.id || o.order_number);
          if (!seenOrderIds.has(id)) {
            seenOrderIds.add(id);
            allOrders.push({
              id,
              order_number: o.order_number || id,
              amount: Number(o.amount) || 0,
              status: o.status || 'pending',
              payment_status: o.payment_status || o.status || 'pending',
              created_at: o.created_at || new Date().toISOString(),
              product_id: o.product_id || o.game_id,
              game_title: o.game_title || 'Game / Mod',
            });
          }
        });
      }
    } catch (e) {}

    // 3. User Statistics (from xx_users and profiles)
    let userCountTotal = 0;
    try {
      const { count: xxCount } = await supabase
        .from('xx_users')
        .select('*', { count: 'exact', head: true });
      if (xxCount !== null && xxCount > 0) {
        userCountTotal = xxCount;
      } else {
        const { count: profileCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        userCountTotal = profileCount || 0;
      }
    } catch (e) {
      userCountTotal = 0;
    }

    // Product Lookup Map
    const productMap = new Map<string, any>();
    (postsList || []).forEach((p) => productMap.set(String(p.id), p));

    // Calculate Financial Aggregates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let failedOrdersCount = 0;

    const completedOrders: any[] = [];

    allOrders.forEach((order) => {
      const isCompleted = isOrderPaid(order);
      const isPending = isOrderPending(order);
      const isFailed = isOrderFailed(order);
      const amt = safeNumber(order.amount);
      const orderTime = new Date(order.created_at || now).getTime();

      if (isCompleted) {
        completedOrdersCount++;
        totalRevenue += amt;
        completedOrders.push(order);

        if (orderTime >= startOfToday) {
          todayRevenue += amt;
        }
        if (orderTime >= startOfMonth) {
          monthRevenue += amt;
        }
      } else if (isPending) {
        pendingOrdersCount++;
      } else if (isFailed) {
        failedOrdersCount++;
      }
    });

    // 5. Top Selling Products (Aggregated from real orders)
    const productSalesMap = new Map<string, { purchases: number; revenue: number }>();
    completedOrders.forEach((o) => {
      const pId = String(o.product_id || o.game_id || '');
      if (pId) {
        const existing = productSalesMap.get(pId) || { purchases: 0, revenue: 0 };
        existing.purchases += 1;
        existing.revenue += safeNumber(o.amount);
        productSalesMap.set(pId, existing);
      }
    });

    const topSellingProducts = Array.from(productSalesMap.entries())
      .map(([pId, s]) => {
        const prod = productMap.get(pId);
        return {
          id: pId,
          title: prod?.title || `Game/Mod #${pId.substring(0, 8)}`,
          category: prod?.category || 'General',
          purchases: s.purchases,
          revenue: s.revenue,
          price: prod?.price || 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // 6. Category Breakdown
    const categoryRevenueMap = new Map<string, { revenue: number; orderCount: number }>();
    completedOrders.forEach((o) => {
      const pId = String(o.product_id || o.game_id || '');
      const prod = productMap.get(pId);
      const cat = prod?.category || o.category || 'General Mods';
      const existing = categoryRevenueMap.get(cat) || { revenue: 0, orderCount: 0 };
      existing.revenue += safeNumber(o.amount);
      existing.orderCount += 1;
      categoryRevenueMap.set(cat, existing);
    });

    const categoryMetrics = Array.from(categoryRevenueMap.entries()).map(([cat, val]) => ({
      name: cat,
      revenue: val.revenue,
      orderCount: val.orderCount,
    }));

    // 7. Compute Real Sales Graph Breakdown (Daily / Monthly)
    const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
    const last7DaysChart = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];

      const dayOrders = completedOrders.filter(
        (o) => o.created_at && o.created_at.startsWith(dayStr)
      );
      const dayRev = dayOrders.reduce((sum, o) => sum + safeNumber(o.amount), 0);

      last7DaysChart.push({
        name: `${dayName} (${d.getDate()}/${d.getMonth() + 1})`,
        revenue: dayRev,
        orders: dayOrders.length,
      });
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyChart = [];

    for (let m = 0; m <= now.getMonth(); m++) {
      const yearStr = now.getFullYear();
      const monthPrefix = `${yearStr}-${String(m + 1).padStart(2, '0')}`;
      const mOrders = completedOrders.filter(
        (o) => o.created_at && o.created_at.startsWith(monthPrefix)
      );
      const mRev = mOrders.reduce((sum, o) => sum + safeNumber(o.amount), 0);

      monthlyChart.push({
        name: months[m],
        revenue: mRev,
        orders: mOrders.length,
      });
    }

    const salesChart = timeframe === '7days' ? last7DaysChart : monthlyChart;

    const metrics = {
      totalRevenue: safeNumber(totalRevenue),
      totalOrders: allOrders.length,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      failedOrders: failedOrdersCount,
      activeUsers: Math.max(userCountTotal, completedOrders.length),
      totalGames: safeNumber(totalProducts || productMap.size),
      lifetimeRevenue: safeNumber(totalRevenue),
      todayRevenue: safeNumber(todayRevenue),
      monthRevenue: safeNumber(monthRevenue),
      topSellingProducts,
      categoryMetrics,
    };

    return NextResponse.json(
      {
        success: true,
        metrics,
        salesChart,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    console.error('Analytics API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
