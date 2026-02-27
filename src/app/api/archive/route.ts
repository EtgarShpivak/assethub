import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET archived assets
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort_by') || 'upload_date';
  const sortDir = searchParams.get('sort_dir') === 'asc';

  const { data, error, count } = await supabase
    .from('assets')
    .select('*, slugs(slug, display_name)', { count: 'exact' })
    .eq('is_archived', true)
    .order(sortBy, { ascending: sortDir });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data || [], total: count || 0 });
}

// POST - restore or permanently delete
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { action, asset_ids } = await request.json();

  if (!action || !asset_ids || !Array.isArray(asset_ids)) {
    return NextResponse.json({ error: 'action and asset_ids required' }, { status: 400 });
  }

  if (action === 'restore') {
    const { error } = await supabase
      .from('assets')
      .update({ is_archived: false })
      .in('id', asset_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ restored: asset_ids.length });
  }

  if (action === 'delete') {
    // Get file paths first for storage cleanup
    const { data: assets } = await supabase
      .from('assets')
      .select('id, drive_file_id')
      .in('id', asset_ids);

    // Delete from storage
    if (assets) {
      const paths = assets
        .map(a => a.drive_file_id)
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from('assets').remove(paths);
      }
    }

    // Delete from DB
    const { error } = await supabase
      .from('assets')
      .delete()
      .in('id', asset_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: asset_ids.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
