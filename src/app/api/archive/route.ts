import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logServerError } from '@/lib/error-logger-server';

export const dynamic = 'force-dynamic';

// GET archived assets
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  // Sort params — allowlist to prevent column injection
  const SORT_ALLOWLIST = ['upload_date', 'original_filename', 'stored_filename', 'file_type', 'file_size', 'archived_at', 'created_at'];
  const rawSortBy = searchParams.get('sort_by') || 'upload_date';
  const sortBy = SORT_ALLOWLIST.includes(rawSortBy) ? rawSortBy : 'upload_date';
  const sortDir = searchParams.get('sort_dir') === 'asc';

  const { data, error, count } = await supabase
    .from('assets')
    .select('*, slugs(slug, display_name)', { count: 'exact' })
    .eq('is_archived', true)
    .order(sortBy, { ascending: sortDir });

  if (error) {
    await logServerError({
      context: 'archive-list',
      errorMessage: `Failed to fetch archived assets: ${error.message}`,
      userId: user.id,
      entityType: 'asset',
    });
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים מהארכיון' }, { status: 500 });
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
      .update({ is_archived: false, archived_at: null })
      .in('id', asset_ids);

    if (error) {
      await logServerError({
        context: 'archive-restore',
        errorMessage: `Failed to restore assets: ${error.message}`,
        userId: user.id,
        entityType: 'asset',
        extra: { asset_ids },
      });
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
        const { error: storageError } = await supabase.storage.from('assets').remove(paths);
        if (storageError) {
          await logServerError({
            context: 'archive-permanent-delete',
            errorMessage: `Failed to remove files from storage: ${storageError.message}`,
            userId: user.id,
            entityType: 'asset',
            extra: { paths, asset_ids },
          });
          // Continue with DB deletion even if storage fails - log the warning
        }
      }
    }

    // Delete from DB
    const { error } = await supabase
      .from('assets')
      .delete()
      .in('id', asset_ids);

    if (error) {
      await logServerError({
        context: 'archive-permanent-delete',
        errorMessage: `Failed to delete assets from DB: ${error.message}`,
        userId: user.id,
        entityType: 'asset',
        extra: { asset_ids },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: asset_ids.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
