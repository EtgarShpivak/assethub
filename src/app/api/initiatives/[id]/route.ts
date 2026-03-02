import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('initiatives')
    .select('*, slugs(slug, display_name)')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Get assets for this initiative
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('initiative_id', params.id)
    .eq('is_archived', false)
    .order('upload_date', { ascending: false });

  return NextResponse.json({ ...data, assets: assets || [] });
}

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

  // Allowlist updatable fields to prevent overwriting id, slug_id, etc.
  const ALLOWED_FIELDS = ['name', 'short_code', 'status', 'start_date', 'end_date', 'notes'];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'לא סופקו שדות לעדכון' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('initiatives')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(request, {
    action: 'edit',
    entityType: 'initiative',
    entityId: params.id,
    entityName: data.name,
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

  // Get name for logging
  const { data: initInfo } = await supabase
    .from('initiatives')
    .select('name')
    .eq('id', params.id)
    .single();

  const { error } = await supabase
    .from('initiatives')
    .update({ status: 'archived' })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(request, {
    action: 'archive',
    entityType: 'initiative',
    entityId: params.id,
    entityName: initInfo?.name || params.id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
