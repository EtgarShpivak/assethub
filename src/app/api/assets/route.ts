import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  // Sort params — allowlist to prevent column injection
  const SORT_ALLOWLIST = ['upload_date', 'original_filename', 'stored_filename', 'file_type', 'file_size', 'dimensions_label', 'aspect_ratio', 'created_at'];
  const rawSortBy = searchParams.get('sort_by') || 'upload_date';
  const sortBy = SORT_ALLOWLIST.includes(rawSortBy) ? rawSortBy : 'upload_date';
  const sortDir = searchParams.get('sort_dir') === 'asc' ? true : false;

  let query = supabase
    .from('assets')
    .select('*, slugs(slug, display_name), initiatives(name, short_code)', { count: 'exact' })
    .eq('is_archived', false)
    .order(sortBy, { ascending: sortDir });

  // Slug filter — supports multiple IDs (comma-separated)
  const slugId = searchParams.get('slug_id');
  if (slugId) {
    const slugIds = slugId.split(',').filter(Boolean);
    if (slugIds.length === 1) {
      // Single slug: include children
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
          query = query.in('slug_id', childSlugs.map((s) => s.id));
        }
      }
    } else {
      query = query.in('slug_id', slugIds);
    }
  }

  // Initiative filter — supports multiple IDs + special __no_initiative__
  const initiativeId = searchParams.get('initiative_id');
  if (initiativeId) {
    const ids = initiativeId.split(',').filter(Boolean);
    const noInit = ids.includes('__no_initiative__');
    const realIds = ids.filter(id => id !== '__no_initiative__');

    if (noInit && realIds.length > 0) {
      query = query.or(`initiative_id.is.null,initiative_id.in.(${realIds.join(',')})`);
    } else if (noInit) {
      query = query.is('initiative_id', null);
    } else if (realIds.length === 1) {
      query = query.eq('initiative_id', realIds[0]);
    } else {
      query = query.in('initiative_id', realIds);
    }
  }

  // File type filter — supports multiple values
  const fileType = searchParams.get('file_type');
  if (fileType) {
    const types = fileType.split(',').filter(Boolean);
    if (types.length === 1) {
      query = query.eq('file_type', types[0]);
    } else {
      query = query.in('file_type', types);
    }
  }

  // Platform filter — supports multiple values (array overlap)
  const platform = searchParams.get('platform');
  if (platform) {
    const platforms = platform.split(',').filter(Boolean);
    if (platform === 'none') {
      query = query.or('platforms.is.null,platforms.eq.{}');
    } else {
      // Use overlaps for array matching (any of the selected platforms)
      query = query.overlaps('platforms', platforms);
    }
  }

  // Aspect ratio filter — supports multiple values
  const aspectRatio = searchParams.get('aspect_ratio');
  if (aspectRatio) {
    const ratios = aspectRatio.split(',').filter(Boolean);
    if (ratios.includes('other')) {
      // "other" means not in standard ratios
      const standardRatios = ['9:16', '1:1', '16:9', '4:5'];
      const selectedStandard = ratios.filter(r => r !== 'other');
      if (selectedStandard.length > 0) {
        // Include selected standard + anything not in standard list
        query = query.or(
          `aspect_ratio.in.(${selectedStandard.join(',')}),aspect_ratio.not.in.(${standardRatios.join(',')})`
        );
      } else {
        // Only "other"
        query = query.not('aspect_ratio', 'in', `(${standardRatios.join(',')})`);
      }
    } else if (ratios.length === 1) {
      query = query.eq('aspect_ratio', ratios[0]);
    } else {
      query = query.in('aspect_ratio', ratios);
    }
  }

  // Dimensions filter
  const dimensions = searchParams.get('dimensions');
  if (dimensions) {
    query = query.eq('dimensions_label', dimensions);
  }

  // Domain context filter — supports multiple
  const domainCtx = searchParams.get('domain_context');
  if (domainCtx) {
    const contexts = domainCtx.split(',').filter(Boolean);
    if (contexts.length === 1) {
      query = query.eq('domain_context', contexts[0]);
    } else {
      query = query.in('domain_context', contexts);
    }
  }

  // Asset type filter — supports multiple
  const assetType = searchParams.get('asset_type');
  if (assetType) {
    const types = assetType.split(',').filter(Boolean);
    if (types.length === 1) {
      query = query.eq('asset_type', types[0]);
    } else {
      query = query.in('asset_type', types);
    }
  }

  // Date range filter
  const dateFrom = searchParams.get('date_from');
  if (dateFrom) {
    query = query.gte('upload_date', dateFrom);
  }
  const dateTo = searchParams.get('date_to');
  if (dateTo) {
    query = query.lte('upload_date', dateTo + 'T23:59:59.999Z');
  }

  // Search — includes filename, notes, stored_filename, slug name, initiative name
  const search = searchParams.get('search');
  if (search) {
    // Sanitize search input — remove PostgREST special chars to prevent filter injection
    const sanitized = search.replace(/[().,\\]/g, '').trim().slice(0, 200);
    if (sanitized) {
      // Find slugs and initiatives matching the search term
      const [slugMatch, initMatch] = await Promise.all([
        supabase.from('slugs').select('id').or(`display_name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`),
        supabase.from('initiatives').select('id').or(`name.ilike.%${sanitized}%,short_code.ilike.%${sanitized}%`),
      ]);

      const matchedSlugIds = (slugMatch.data || []).map(s => s.id);
      const matchedInitIds = (initMatch.data || []).map(i => i.id);

      // Build OR conditions: text fields + matching slug/initiative IDs
      const orParts = [
        `original_filename.ilike.%${sanitized}%`,
        `notes.ilike.%${sanitized}%`,
        `stored_filename.ilike.%${sanitized}%`,
      ];
      if (matchedSlugIds.length > 0) {
        orParts.push(`slug_id.in.(${matchedSlugIds.join(',')})`);
      }
      if (matchedInitIds.length > 0) {
        orParts.push(`initiative_id.in.(${matchedInitIds.join(',')})`);
      }

      query = query.or(orParts.join(','));
    }
  }

  // Tag search — find assets containing specific tag(s), comma separated
  const tag = searchParams.get('tag');
  if (tag) {
    if (tag === '__no_tags__') {
      query = query.or('tags.is.null,tags.eq.{}');
    } else {
      const tagList = tag.split(',').filter(Boolean);
      if (tagList.length === 1) {
        query = query.contains('tags', [tagList[0]]);
      } else {
        // Match ANY of the tags (OR logic)
        query = query.or(tagList.map(t => `tags.cs.{${t}}`).join(','));
      }
    }
  }

  // Unclassified filter
  const unclassified = searchParams.get('unclassified');
  if (unclassified === 'true') {
    query = query.or('platforms.is.null,platforms.eq.{}');
  }

  // Uploaded-by filter — supports single user ID
  const uploadedBy = searchParams.get('uploaded_by');
  if (uploadedBy) {
    query = query.eq('uploaded_by', uploadedBy);
  }

  // Expiry filter
  const expiry = searchParams.get('expiry');
  if (expiry === 'valid') {
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
  } else if (expiry === 'expiring_7days') {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    query = query.not('expires_at', 'is', null)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', in7Days.toISOString());
  } else if (expiry === 'expiring_soon') {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    query = query.not('expires_at', 'is', null)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', in30Days.toISOString());
  }

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '48');
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Assets query error:', error.message);
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים' }, { status: 500 });
  }

  const assets = data || [];

  // Enrich assets with uploader names (batch lookup — avoids N+1)
  const uploaderIds = Array.from(new Set(assets.map(a => a.uploaded_by).filter(Boolean))) as string[];
  let uploaderMap = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, email')
      .in('id', uploaderIds);

    if (profiles) {
      uploaderMap = new Map(
        profiles.map(p => [p.id, p.display_name || p.email || 'משתמש'])
      );
    }
  }

  const enrichedAssets = assets.map(asset => ({
    ...asset,
    uploaded_by_name: asset.uploaded_by ? uploaderMap.get(asset.uploaded_by) || null : null,
  }));

  // Build unique uploaders list for filter dropdown
  const uploaders = Array.from(uploaderMap.entries()).map(([id, name]) => ({ id, name }));

  return NextResponse.json({ assets: enrichedAssets, total: count, uploaders });
}
