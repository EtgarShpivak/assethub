import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isAdminUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — admin only — fetch comprehensive system log with filtering
export async function GET(request: NextRequest) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'גישה נדחתה — דרושות הרשאות מנהל' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');
  const action = searchParams.get('action');
  const entityType = searchParams.get('entity_type');
  const userId = searchParams.get('user_id');
  const errorsOnly = searchParams.get('errors_only') === 'true';
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const search = searchParams.get('search');

  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (errorsOnly) {
    query = query.eq('action', 'error');
  } else if (action) {
    query = query.eq('action', action);
  }

  if (entityType) query = query.eq('entity_type', entityType);
  if (userId) query = query.eq('user_id', userId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
  if (search) query = query.or(`entity_name.ilike.%${search}%,user_name.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique users for filter dropdown
  const { data: users } = await supabase
    .from('activity_log')
    .select('user_id, user_name')
    .not('user_id', 'is', null);

  const userMap = new Map<string, string>();
  (users || []).forEach(u => {
    if (u.user_id && u.user_name) userMap.set(u.user_id, u.user_name);
  });
  const uniqueUsers = Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));

  // Get error count for stats
  const { count: errorCount } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'error');

  // Get today's event count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  return NextResponse.json({
    entries: data || [],
    total: count || 0,
    users: uniqueUsers,
    stats: {
      totalEvents: count || 0,
      errorCount: errorCount || 0,
      todayCount: todayCount || 0,
    },
  });
}
