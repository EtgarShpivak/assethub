import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  // Default to last 6 months, clamped 1-24
  const rawMonths = parseInt(searchParams.get('months') || '6');
  const monthsBack = Math.min(Math.max(isNaN(rawMonths) ? 6 : rawMonths, 1), 24);
  // Use 1st of month to avoid edge cases (e.g., March 31 - 1 month ≠ Feb 28)
  const fromDate = new Date();
  fromDate.setDate(1);
  fromDate.setMonth(fromDate.getMonth() - monthsBack);

  // Get activity data grouped by month and action
  const { data: activities, error } = await supabase
    .from('activity_log')
    .select('action, created_at, user_id, user_name, entity_name')
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by month
  const monthlyData: Record<string, { uploads: number; downloads: number; views: number; other: number }> = {};
  const userActivity: Record<string, { name: string; count: number }> = {};
  const topAssets: Record<string, { name: string; count: number }> = {};

  for (const entry of activities || []) {
    const month = entry.created_at.slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { uploads: 0, downloads: 0, views: 0, other: 0 };
    }

    if (entry.action === 'upload') monthlyData[month].uploads++;
    else if (entry.action === 'download') monthlyData[month].downloads++;
    else if (entry.action === 'view') monthlyData[month].views++;
    else monthlyData[month].other++;

    // User activity
    if (entry.user_id) {
      if (!userActivity[entry.user_id]) {
        userActivity[entry.user_id] = { name: entry.user_name || 'Unknown', count: 0 };
      }
      userActivity[entry.user_id].count++;
    }

    // Top assets (by downloads)
    if (entry.action === 'download' && entry.entity_name) {
      if (!topAssets[entry.entity_name]) {
        topAssets[entry.entity_name] = { name: entry.entity_name, count: 0 };
      }
      topAssets[entry.entity_name].count++;
    }
  }

  // Build heatmap data: day-of-week × hour
  const heatmap: Record<number, Record<number, number>> = {};
  for (let d = 0; d < 7; d++) {
    heatmap[d] = {};
    for (let h = 0; h < 24; h++) {
      heatmap[d][h] = 0;
    }
  }
  for (const entry of activities || []) {
    const date = new Date(entry.created_at);
    const day = date.getDay(); // 0=Sun
    const hour = date.getHours();
    heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
  }

  const totalUploads = Object.values(monthlyData).reduce((s, m) => s + m.uploads, 0);
  const totalDownloads = Object.values(monthlyData).reduce((s, m) => s + m.downloads, 0);
  const activeUsers = Object.keys(userActivity).length;

  return NextResponse.json({
    monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
    summary: { totalUploads, totalDownloads, activeUsers },
    topUsers: Object.values(userActivity).sort((a, b) => b.count - a.count).slice(0, 10),
    topAssets: Object.values(topAssets).sort((a, b) => b.count - a.count).slice(0, 10),
    heatmap,
  });
}
