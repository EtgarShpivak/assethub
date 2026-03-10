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

  // Text search (matches filename, notes, external_url, tags, slug names, initiative names)
  const search = searchParams.get('search');
  if (search) {
    const sanitized = search.replace(/[(),\\]/g, '').trim().slice(0, 200);
    if (sanitized) {
      // Find matching slugs, initiatives, and tags in parallel
      const [slugMatch, initMatch, tagRows] = await Promise.all([
        supabase.from('slugs').select('id').or(`display_name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`),
        supabase.from('initiatives').select('id').or(`name.ilike.%${sanitized}%,short_code.ilike.%${sanitized}%`),
        supabase.from('assets').select('tags').not('tags', 'is', null),
      ]);

      const matchedSlugIds = (slugMatch.data || []).map(s => s.id);
      const matchedInitIds = (initMatch.data || []).map(i => i.id);

      // Extract unique tags that match search term
      const matchedTags: string[] = [];
      const seen = new Set<string>();
      for (const row of tagRows.data || []) {
        if (Array.isArray(row.tags)) {
          for (const t of row.tags) {
            if (t && typeof t === 'string' && !seen.has(t) && t.toLowerCase().includes(sanitized.toLowerCase())) {
              seen.add(t);
              matchedTags.push(t);
            }
          }
        }
      }

      const orParts = [
        `original_filename.ilike.%${sanitized}%`,
        `notes.ilike.%${sanitized}%`,
        `stored_filename.ilike.%${sanitized}%`,
        `text_content.ilike.%${sanitized}%`,
        `external_url.ilike.%${sanitized}%`,
      ];
      if (matchedSlugIds.length > 0) {
        orParts.push(`slug_id.in.(${matchedSlugIds.join(',')})`);
      }
      if (matchedInitIds.length > 0) {
        orParts.push(`initiative_id.in.(${matchedInitIds.join(',')})`);
      }
      for (const t of matchedTags) {
        const safeTag = t.replace(/[(),\\{}]/g, '');
        if (safeTag) orParts.push(`tags.cs.{${safeTag}}`);
      }
      query = query.or(orParts.join(','));
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

  // Advanced search — multi-condition with AND/OR operators
  const advancedParam = searchParams.get('advanced');
  if (advancedParam) {
    try {
      const conditions: { field: string; value: string; operator: string }[] = JSON.parse(advancedParam);
      const validConditions = conditions.filter(c => c.value && c.value.trim());

      if (validConditions.length > 0) {
        const groups: typeof validConditions[] = [];
        let currentGroup: typeof validConditions = [];
        for (const cond of validConditions) {
          if (cond.operator === 'OR' && currentGroup.length > 0) {
            groups.push(currentGroup);
            currentGroup = [cond];
          } else {
            currentGroup.push(cond);
          }
        }
        if (currentGroup.length > 0) groups.push(currentGroup);

        const groupIdSets: Set<string>[] = [];
        for (const group of groups) {
          let groupIds: Set<string> | null = null;
          for (const cond of group) {
            const sanitized = cond.value.replace(/[(),\\]/g, '').trim().slice(0, 200);
            if (!sanitized) continue;
            let condQuery = supabase.from('assets').select('id').eq('is_archived', false);
            switch (cond.field) {
              case 'search':
                condQuery = condQuery.or(`original_filename.ilike.%${sanitized}%,notes.ilike.%${sanitized}%,stored_filename.ilike.%${sanitized}%,text_content.ilike.%${sanitized}%,external_url.ilike.%${sanitized}%`);
                break;
              case 'tag': condQuery = condQuery.contains('tags', [sanitized]); break;
              case 'slug': condQuery = condQuery.eq('slug_id', sanitized); break;
              case 'campaign': condQuery = condQuery.eq('initiative_id', sanitized); break;
              case 'file_type': condQuery = condQuery.eq('file_type', sanitized); break;
              case 'platform': condQuery = condQuery.overlaps('platforms', [sanitized]); break;
              case 'domain_context': condQuery = condQuery.eq('domain_context', sanitized); break;
              case 'asset_type': condQuery = condQuery.eq('asset_type', sanitized); break;
              default: continue;
            }
            const { data: matchData } = await condQuery.limit(5000);
            const matchIds = new Set((matchData || []).map(r => r.id));
            if (groupIds === null) { groupIds = matchIds; } else { groupIds = new Set(Array.from(groupIds).filter(id => matchIds.has(id))); }
          }
          if (groupIds) groupIdSets.push(groupIds);
        }

        if (groupIdSets.length > 0) {
          const finalIds = new Set<string>();
          for (const s of groupIdSets) { Array.from(s).forEach(id => finalIds.add(id)); }
          if (finalIds.size === 0) {
            return NextResponse.json({ file_types: {}, platforms: {}, aspect_ratios: {}, domain_contexts: {}, asset_types: {}, slugs: {}, initiatives: {}, total: 0 });
          }
          query = query.in('id', Array.from(finalIds));
        }
      }
    } catch { /* ignore invalid JSON */ }
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
