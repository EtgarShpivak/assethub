import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET single collection with assets
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Get assets in collection
  const { data: collectionAssets } = await supabase
    .from('collection_assets')
    .select('asset_id, assets(*, slugs(slug, display_name), initiatives(name, short_code))')
    .eq('collection_id', params.id)
    .order('added_at', { ascending: false });

  const assets = (collectionAssets || []).map(ca => (ca as Record<string, unknown>).assets).filter(Boolean);

  return NextResponse.json({ ...collection, assets, asset_count: assets.length });
}

// PATCH update collection
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  // Handle adding/removing assets
  if (body.add_asset_ids) {
    const rows = (body.add_asset_ids as string[]).map(asset_id => ({
      collection_id: params.id,
      asset_id,
    }));
    await supabase.from('collection_assets').upsert(rows, { onConflict: 'collection_id,asset_id' });
  }

  if (body.remove_asset_ids) {
    await supabase
      .from('collection_assets')
      .delete()
      .eq('collection_id', params.id)
      .in('asset_id', body.remove_asset_ids);
  }

  // Update collection metadata
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.is_shared !== undefined) updates.is_shared = body.is_shared;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(request, {
    action: 'edit',
    entityType: 'collection',
    entityId: params.id,
    userId: user.id,
    metadata: {
      added_assets: body.add_asset_ids?.length || 0,
      removed_assets: body.remove_asset_ids?.length || 0,
      metadata_changes: Object.keys(updates),
    },
  });

  return NextResponse.json({ success: true });
}

// DELETE collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Get name for logging
  const { data: collInfo } = await supabase
    .from('collections')
    .select('name')
    .eq('id', params.id)
    .single();

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(request, {
    action: 'delete',
    entityType: 'collection',
    entityId: params.id,
    entityName: collInfo?.name || params.id,
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
