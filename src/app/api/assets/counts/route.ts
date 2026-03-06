import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Fetch all non-archived assets' relevant fields for counting
  const { data: assets, error } = await supabase
    .from('assets')
    .select('file_type, platforms, aspect_ratio, domain_context, asset_type, slug_id, initiative_id')
    .eq('is_archived', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = {
    file_types: {} as Record<string, number>,
    platforms: {} as Record<string, number>,
    aspect_ratios: {} as Record<string, number>,
    domain_contexts: {} as Record<string, number>,
    asset_types: {} as Record<string, number>,
    slugs: {} as Record<string, number>,
    initiatives: {} as Record<string, number>,
    total: (assets || []).length,
  };

  for (const asset of assets || []) {
    // File type
    if (asset.file_type) {
      counts.file_types[asset.file_type] = (counts.file_types[asset.file_type] || 0) + 1;
    }
    // Platforms (array)
    if (asset.platforms && Array.isArray(asset.platforms)) {
      for (const p of asset.platforms) {
        counts.platforms[p] = (counts.platforms[p] || 0) + 1;
      }
    }
    // Aspect ratio
    if (asset.aspect_ratio) {
      counts.aspect_ratios[asset.aspect_ratio] = (counts.aspect_ratios[asset.aspect_ratio] || 0) + 1;
    }
    // Domain context
    if (asset.domain_context) {
      counts.domain_contexts[asset.domain_context] = (counts.domain_contexts[asset.domain_context] || 0) + 1;
    }
    // Asset type
    if (asset.asset_type) {
      counts.asset_types[asset.asset_type] = (counts.asset_types[asset.asset_type] || 0) + 1;
    }
    // Slug
    if (asset.slug_id) {
      counts.slugs[asset.slug_id] = (counts.slugs[asset.slug_id] || 0) + 1;
    }
    // Initiative
    if (asset.initiative_id) {
      counts.initiatives[asset.initiative_id] = (counts.initiatives[asset.initiative_id] || 0) + 1;
    }
  }

  return NextResponse.json(counts);
}
