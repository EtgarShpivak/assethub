import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Aggregate all unique tags from assets
  const { data, error } = await supabase
    .from('assets')
    .select('tags')
    .not('tags', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten and deduplicate tags
  const tagSet = new Set<string>();
  for (const row of data || []) {
    if (Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        if (tag && typeof tag === 'string') {
          tagSet.add(tag.trim());
        }
      }
    }
  }

  const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'he'));

  return NextResponse.json(tags);
}
