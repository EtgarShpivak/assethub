import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET activity log
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');

  try {
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Activity log query failed:', err);
    return NextResponse.json([]);
  }
}

// POST log activity (internal use from other routes)
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
        metadata: metadata || {},
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
