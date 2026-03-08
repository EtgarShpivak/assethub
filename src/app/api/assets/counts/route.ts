import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  // Base query — only non-archived assets, select facet columns
  let query = supabase
    .from('assets')
    .select('file_type, platforms, aspect_ratio, domain_context, asset_type, slug_id, initiative_id')
    .eq('is_archived', false);

  // Apply filters (mirrors /api/assets logic for accurate faceted counts)

  // Slug filter
  const slugId = searchParams.get('slug_id');
  if (slugId) {
    const slugIds = slugId.split(',').filter(Boolean);
    if (slugIds.length === 1) {
      const { data: slugData } = await supabase
        .from('slugs')
        .select('slug')
        .eq('id', slugIds[0])
        .single();
      if (slugData) {
        const { data: childSlugs } = await supabase
          .from('slugs')
          .select('id')
          .or(`slug.eq.${slugData.slug},slug.like.${slugData.slug}-%`);
        if (childSlugs) {
          query = query.in('slug_id', childSlugs.map(s => s.id));
        }
      }
    } else {
      query = query.in('slug_id', slugIds);
    }
  }

  // Initiative filter
  const initiativeId = searchParams.get('initiative_id');
  if (initiativeId) {
    const ids = initiativeId.split(',').filter(Boolean);
    const noInit = ids.includes('__no_initiative__');
    const realIds = ids.filter(id => id !== '__no_initiative__');
    if (noInit && realIds.length > 0) {
      query = query.or(`initiative_id.is.null,initiative_id.in.(${realIds.join(',')})`);
    } else if (noInit) {
      query = query.is('initiative_id', null);
    } else {
      query = query.in('initiative_id', realIds);
    }
  }

  // File type filter
  const fileType = searchParams.get('file_type');
  if (fileType) {
    const types = fileType.split(',').filter(Boolean);
    query = query.in('file_type', types);
  }

  // Platform filter
  const platform = searchParams.get('platform');
  if (platform) {
    const platforms = platform.split(',').filter(Boolean);
    if (platform === 'none') {
      query = query.or('platforms.is.null,platforms.eq.{}');
    } else {
      query = query.overlaps('platforms', platforms);
    }
  }

  // Aspect ratio filter
  const aspectRatio = searchParams.get('aspect_ratio');
  if (aspectRatio) {
    const ratios = aspectRatio.split(',').filter(Boolean);
    if (ratios.includes('other')) {
      const standardRatios = ['9:16', '1:1', '16:9', '4:5'];
      const selectedStandard = ratios.filter(r => r !== 'other');
      if (selectedStandard.length > 0) {
        query = query.or(
          `aspect_ratio.in.(${selectedStandard.join(',')}),aspect_ratio.not.in.(${standardRatios.join(',')})`
        );
      } else {
        query = query.not('aspect_ratio', 'in', `(${standardRatios.join(',')})`);
      }
    } else {
      query = query.in('aspect_ratio', ratios);
    }
  }

  // Domain context filter
  const domainCtx = searchParams.get('domain_context');
  if (domainCtx) {
    const contexts = domainCtx.split(',').filter(Boolean);
    query = query.in('domain_context', contexts);
  }

  // Asset type filter
  const assetType = searchParams.get('asset_type');
  if (assetType) {
    const types = assetType.split(',').filter(Boolean);
    query = query.in('asset_type', types);
  }

  // Date range filter
  const dateFrom = searchParams.get('date_from');
  if (dateFrom) query = query.gte('upload_date', dateFrom);
  const dateTo = searchParams.get('date_to');
  if (dateTo) query = query.lte('upload_date', dateTo + 'T23:59:59.999Z');

  // Tag filter
  const tag = searchParams.get('tag');
  if (tag) {
    if (tag === '__no_tags__') {
      query = query.or('tags.is.null,tags.eq.{}');
    } else {
      const tagList = tag.split(',').filter(Boolean);
      if (tagList.length === 1) {
        query = query.contains('tags', [tagList[0]]);
      } else {
        query = query.or(tagList.map(t => `tags.cs.{${t}}`).join(','));
      }
    }
  }

  // Text search (simplified — matches filename, notes, external_url)
  const search = searchParams.get('search');
  if (search) {
    const sanitized = search.replace(/[(),\\]/g, '').trim().slice(0, 200);
    if (sanitized) {
      query = query.or(
        `original_filename.ilike.%${sanitized}%,notes.ilike.%${sanitized}%,stored_filename.ilike.%${sanitized}%,external_url.ilike.%${sanitized}%`
      );
    }
  }

  // Uploaded-by filter
  const uploadedBy = searchParams.get('uploaded_by');
  if (uploadedBy) query = query.eq('uploaded_by', uploadedBy);

  // Favorites filter
  const favoritesOnly = searchParams.get('favorites_only');
  if (favoritesOnly === 'true') {
    const { data: favData } = await supabase
      .from('favorites')
      .select('asset_id')
      .eq('user_id', user.id);
    const favoriteIds = (favData || []).map(f => f.asset_id);
    if (favoriteIds.length === 0) {
      return NextResponse.json({ file_types: {}, platforms: {}, aspect_ratios: {}, domain_contexts: {}, asset_types: {}, slugs: {}, initiatives: {}, total: 0 });
    }
    query = query.in('id', favoriteIds);
  }

  const { data: assets, error } = await query;

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
    if (asset.file_type) {
      counts.file_types[asset.file_type] = (counts.file_types[asset.file_type] || 0) + 1;
    }
    if (asset.platforms && Array.isArray(asset.platforms)) {
      for (const p of asset.platforms) {
        counts.platforms[p] = (counts.platforms[p] || 0) + 1;
      }
    }
    if (asset.aspect_ratio) {
      counts.aspect_ratios[asset.aspect_ratio] = (counts.aspect_ratios[asset.aspect_ratio] || 0) + 1;
    }
    if (asset.domain_context) {
      counts.domain_contexts[asset.domain_context] = (counts.domain_contexts[asset.domain_context] || 0) + 1;
    }
    if (asset.asset_type) {
      counts.asset_types[asset.asset_type] = (counts.asset_types[asset.asset_type] || 0) + 1;
    }
    if (asset.slug_id) {
      counts.slugs[asset.slug_id] = (counts.slugs[asset.slug_id] || 0) + 1;
    }
    if (asset.initiative_id) {
      counts.initiatives[asset.initiative_id] = (counts.initiatives[asset.initiative_id] || 0) + 1;
    }
  }

  return NextResponse.json(counts);
}
