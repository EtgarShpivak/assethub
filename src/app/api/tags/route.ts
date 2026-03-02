import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Aggregate all unique tags from assets with usage count
  const { data, error } = await supabase
    .from('assets')
    .select('tags')
    .not('tags', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count tag usage
  const tagCounts = new Map<string, number>();
  for (const row of data || []) {
    if (Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        if (tag && typeof tag === 'string') {
          const t = tag.trim();
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    }
  }

  const tags = Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

  return NextResponse.json(tags);
}

// Rename a tag across all assets
export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { oldName, newName } = await request.json();

  if (!oldName || !newName) {
    return NextResponse.json({ error: 'Missing oldName or newName' }, { status: 400 });
  }

  // Find all assets containing the old tag
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, tags')
    .contains('tags', [oldName]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update each asset, replacing the old tag with the new one
  let updated = 0;
  for (const asset of assets || []) {
    const newTags = (asset.tags as string[]).map(t => t === oldName ? newName : t);
    // Remove duplicates
    const uniqueTags = Array.from(new Set(newTags));
    const { error: updateError } = await supabase
      .from('assets')
      .update({ tags: uniqueTags })
      .eq('id', asset.id);
    if (!updateError) updated++;
  }

  await logActivity(request, {
    action: 'edit',
    entityType: 'tag',
    entityName: `${oldName} → ${newName}`,
    userId: user.id,
    metadata: { old_name: oldName, new_name: newName, affected_assets: updated },
  });

  return NextResponse.json({ updated });
}

// Delete a tag from all assets
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Missing tag name' }, { status: 400 });
  }

  // Find all assets containing this tag
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, tags')
    .contains('tags', [name]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove tag from each asset
  let updated = 0;
  for (const asset of assets || []) {
    const newTags = (asset.tags as string[]).filter(t => t !== name);
    const { error: updateError } = await supabase
      .from('assets')
      .update({ tags: newTags.length > 0 ? newTags : null })
      .eq('id', asset.id);
    if (!updateError) updated++;
  }

  await logActivity(request, {
    action: 'delete',
    entityType: 'tag',
    entityName: name,
    userId: user.id,
    metadata: { affected_assets: updated },
  });

  return NextResponse.json({ updated });
}
