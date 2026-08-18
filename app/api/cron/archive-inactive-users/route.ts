import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Automated Archiving Task (Cron / Server Action)
// Checks users where last_sign_in_at is older than 180 days and sets status to 'archived'
export async function POST(req: Request) {
  try {
    // Optional: Protect cron route using Bearer token secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 180 days ago limit
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    // Fetch active users who haven't logged in for 180 days
    // We only archive standard users ('user'), we never auto-archive administrators ('admin')
    const { data: inactiveUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, last_sign_in_at')
      .eq('status', 'active')
      .eq('role', 'user')
      .lt('last_sign_in_at', sixMonthsAgo.toISOString());

    if (fetchError) throw fetchError;

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        archived_count: 0,
        message: 'No inactive accounts older than 180 days found.',
      });
    }

    const idsToArchive = inactiveUsers.map((u) => u.id);

    // Update their status to 'archived'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .in('id', idsToArchive);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      archived_count: idsToArchive.length,
      archived_users: inactiveUsers.map((u) => u.email),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Support GET for manual checks / testing from dashboard or external cron services
export async function GET(req: Request) {
  return POST(req);
}
