import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logServerError } from '@/lib/error-logger-server';

export const dynamic = 'force-dynamic';

// GET all collections for current user
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('collections')
    .select('*, collection_assets(count)')
    .or(`created_by.eq.${user.id},is_shared.eq.true`)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map count
  const collections = (data || []).map(c => ({
    ...c,
    asset_count: c.collection_assets?.[0]?.count || 0,
    collection_assets: undefined,
  }));

  return NextResponse.json(collections);
}

// POST create new collection
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { name, description, is_shared, asset_ids } = await request.json();

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  // Get workspace
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('workspace_ids')
    .eq('id', user.id)
    .single();

  const workspaceId = profile?.workspace_ids?.[0];

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({
      workspace_id: workspaceId,
      name,
      description: description || null,
      created_by: user.id,
      is_shared: is_shared || false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add assets if provided
  if (asset_ids && Array.isArray(asset_ids) && asset_ids.length > 0) {
    const rows = asset_ids.map((asset_id: string) => ({
      collection_id: collection.id,
      asset_id,
    }));
    const { error: assetsError } = await supabase.from('collection_assets').insert(rows);
    if (assetsError) {
      await logServerError({
        context: 'collection-add-assets',
        errorMessage: `Failed to add assets to collection: ${assetsError.message}`,
        userId: user.id,
        entityType: 'collection',
        entityId: collection.id,
        entityName: name,
        extra: { asset_ids },
      });
      // Return the collection anyway but include a warning
      return NextResponse.json({ ...collection, warning: 'האוסף נוצר אך חלק מהחומרים לא נוספו' });
    }
  }

  return NextResponse.json(collection);
}
