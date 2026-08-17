import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function safeNumber(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7days';

    const supabase = createAdminClient();

    // 1. Total real store products (from 'posts' & 'games' tables)
    let totalProducts = 0;
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    const { count: gamesCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    totalProducts = (postsCount || 0) + (gamesCount || 0);

    // 2. Fetch real orders from 'orders' and 'payment_orders'
    let allOrders: any[] = [];
    
    try {
      const { data: oData } = await supabase
        .from('orders')
        .select('id, order_number, amount, status, payment_status, created_at, product_id, game_id, game_title');
      if (oData && oData.length > 0) {
        allOrders = oData;
      }
    } catch {}

    try {
      const { data: legacyOrders } = await supabase
        .from('payment_orders')
        .select('id, amount, status, created_at, post_id');
      if (legacyOrders && legacyOrders.length > 0) {
        if (allOrders.length === 0) {
          allOrders = legacyOrders.map((l) => ({
            id: l.id,
            amount: l.amount,
            status: l.status,
            created_at: l.created_at,
            product_id: l.post_id,
            game_id: l.post_id,
          }));
        }
      }
    } catch {}

    const completedOrders = allOrders.filter((o) =>
      ['approved', 'completed', 'paid'].includes((o.status || '').toLowerCase()) ||
      (o.payment_status || '').toLowerCase() === 'completed'
    );
    const pendingOrders = allOrders.filter((o) => (o.status || '').toLowerCase() === 'pending');
    const failedOrders = allOrders.filter((o) =>
      ['rejected', 'cancelled', 'failed', 'trashed'].includes((o.status || '').toLowerCase())
    );

    const totalRevenue = completedOrders.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

    // 3. Registered users count (from profiles, xx_users, and unique buyers)
    let userCountTotal = 0;
    try {
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (profileCount !== null && profileCount > 0) {
        userCountTotal = profileCount;
      } else {
        const { count: xxCount } = await supabase
          .from('xx_users')
          .select('*', { count: 'exact', head: true });
        userCountTotal = xxCount || 0;
      }
    } catch {
      userCountTotal = 0;
    }

    // 4. Fetch posts for product titles & categories
    const { data: postsList } = await supabase
      .from('posts')
      .select('id, title, category, price, views');
    
    const { data: gamesList } = await supabase
      .from('games')
      .select('id, title, category, price');

    const productMap = new Map<string, any>();
    (postsList || []).forEach((p) => productMap.set(String(p.id), p));
    (gamesList || []).forEach((g) => {
      if (!productMap.has(String(g.id))) productMap.set(String(g.id), g);
    });

    // 5. Top Selling Products (Aggregated from real orders)
    const productSalesMap = new Map<string, { purchases: number; revenue: number }>();
    completedOrders.forEach((o) => {
      const pId = String(o.product_id || o.game_id || o.post_id || '');
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

    // 6. Real Category Breakdown
    const categoryRevenueMap = new Map<string, { revenue: number; orderCount: number }>();
    completedOrders.forEach((o) => {
      const pId = String(o.product_id || o.game_id || o.post_id || '');
      const prod = productMap.get(pId);
      const cat = prod?.category || 'General Mods';
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
    const now = new Date();
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
      failedOrders: failedOrders.length,
      activeUsers: Math.max(userCountTotal, completedOrders.length),
      totalGames: safeNumber(totalProducts || productMap.size),
      lifetimeRevenue: safeNumber(totalRevenue),
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
