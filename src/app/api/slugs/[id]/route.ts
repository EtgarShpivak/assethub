import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();

  // Allowlist updatable fields to prevent overwriting id, workspace_id, etc.
  const ALLOWED_FIELDS = ['display_name', 'slug', 'parent_slug', 'is_archived', 'notes'];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'לא סופקו שדות לעדכון' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('slugs')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(request, {
    action: 'edit',
    entityType: 'slug',
    entityId: params.id,
    entityName: data.display_name || data.slug,
    userId: user.id,
    metadata: { changes: body },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Get slug info for logging before deleting
  const { data: slugInfo } = await supabase
    .from('slugs')
    .select('slug, display_name')
    .eq('id', params.id)
    .single();

  // Check for associated assets
  const { count } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('slug_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'לא ניתן למחוק סלאג שיש לו חומרים משויכים. העבר לארכיון במקום.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('slugs')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(request, {
    action: 'delete',
    entityType: 'slug',
    entityId: params.id,
    entityName: slugInfo?.display_name || slugInfo?.slug || params.id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
