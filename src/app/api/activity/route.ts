import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — unified activity log with full filtering, stats, and tab support
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');
  const tab = searchParams.get('tab') || 'all';
  const action = searchParams.get('action');
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');
  const userId = searchParams.get('user_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const search = searchParams.get('search');

  try {
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Tab-based filtering
    if (tab === 'uploads') {
      query = query.eq('action', 'upload');
    } else if (tab === 'searches') {
      query = query.eq('action', 'download');
    } else if (tab === 'management') {
      query = query.in('entity_type', ['slug', 'initiative', 'collection', 'tag']);
    } else if (tab === 'errors') {
      query = query.eq('action', 'error');
    }

    // Additional filters (on top of tab)
    // Skip action filter if tab already defines one (prevents double .eq('action', ...) conflict)
    const tabDefinesAction = ['uploads', 'searches', 'errors'].includes(tab);
    if (action && !tabDefinesAction) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (userId) query = query.eq('user_id', userId);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
    if (search) query = query.or(`entity_name.ilike.%${search}%,user_name.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Users list for filter dropdown
    const { data: users } = await supabase
      .from('activity_log')
      .select('user_id, user_name')
      .not('user_id', 'is', null);

    const userMap = new Map<string, string>();
    (users || []).forEach(u => {
      if (u.user_id && u.user_name) userMap.set(u.user_id, u.user_name);
    });
    const uniqueUsers = Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));

    // Stats — run in parallel for performance (always unfiltered totals)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalRes, errorRes, todayRes, uploadRes, downloadRes] = await Promise.all([
      supabase.from('activity_log').select('*', { count: 'exact', head: true }),
      supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('action', 'error'),
      supabase.from('activity_log').select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('action', 'upload'),
      supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('action', 'download'),
    ]);

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      users: uniqueUsers,
      stats: {
        totalEvents: totalRes.count || 0,
        errorCount: errorRes.count || 0,
        todayCount: todayRes.count || 0,
        uploadCount: uploadRes.count || 0,
        downloadCount: downloadRes.count || 0,
      },
    });
  } catch (err) {
    console.error('Activity log query failed:', err);
    return NextResponse.json({
      entries: [],
      total: 0,
      users: [],
      stats: { totalEvents: 0, errorCount: 0, todayCount: 0, uploadCount: 0, downloadCount: 0 },
    });
  }
}

// POST log activity (kept for backwards compatibility with client-side logging)
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { action, entity_type, entity_id, entity_name, metadata } = await request.json();

  if (!action || !entity_type) {
    return NextResponse.json({ error: 'action and entity_type required' }, { status: 400 });
  }

  try {
    // Get user info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, email, workspace_ids')
      .eq('id', user.id)
      .single();

    const userName = profile?.display_name || profile?.email || 'משתמש';
    const workspaceId = profile?.workspace_ids?.[0];

    // Extract IP/UA from request
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        user_name: userName,
        action,
        entity_type,
        entity_id: entity_id || null,
        entity_name: entity_name || null,
        metadata: {
          ...(metadata || {}),
          ip,
          user_agent: userAgent,
        },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    console.error('Activity log insert failed:', err);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
