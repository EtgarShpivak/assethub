import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const [
    topDownloadedAssets,
    zeroResultSearches,
    neverDownloadedCount,
    usageBySlugs,
    usageByInitiative,
    uploadTrends,
    fileTypeBreakdown,
    platformBreakdown,
  ] = await Promise.all([
    // 1. Top 10 downloaded assets
    (async () => {
      try {
        // Get download counts grouped by entity_id from activity_log
        const { data: downloads, error: dlError } = await supabase
          .from('activity_log')
          .select('entity_id')
          .eq('action', 'download')
          .not('entity_id', 'is', null);

        if (dlError) throw dlError;
        if (!downloads || downloads.length === 0) return [];

        // Count downloads per entity_id
        const countMap: Record<string, number> = {};
        for (const row of downloads) {
          countMap[row.entity_id] = (countMap[row.entity_id] || 0) + 1;
        }

        // Sort by count descending and take top 10
        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        if (topIds.length === 0) return [];

        // Fetch asset filenames for those IDs
        const { data: assets, error: assetError } = await supabase
          .from('assets')
          .select('id, original_filename')
          .in('id', topIds.map(([id]) => id));

        if (assetError) throw assetError;

        const assetMap: Record<string, string> = {};
        for (const a of assets || []) {
          assetMap[a.id] = a.original_filename;
        }

        return topIds.map(([id, count]) => ({
          id,
          filename: assetMap[id] || 'Unknown',
          download_count: count,
        }));
      } catch {
        return null;
      }
    })(),

    // 2. Zero-result searches
    // TODO: Track search queries in a future table
    (async () => {
      try {
        return [];
      } catch {
        return null;
      }
    })(),

    // 3. Never-downloaded assets count
    (async () => {
      try {
        // Get all entity_ids that have been downloaded
        const { data: downloaded, error: dlError } = await supabase
          .from('activity_log')
          .select('entity_id')
          .eq('action', 'download')
          .not('entity_id', 'is', null);

        if (dlError) throw dlError;

        const downloadedIds = Array.from(new Set((downloaded || []).map((d) => d.entity_id)));

        let query = supabase
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false);

        if (downloadedIds.length > 0) {
          query = query.not('id', 'in', `(${downloadedIds.join(',')})`);
        }

        const { count, error: countError } = await query;

        if (countError) throw countError;

        return count ?? 0;
      } catch {
        return null;
      }
    })(),

    // 4. Usage by slugs
    (async () => {
      try {
        const { data: slugs, error: slugError } = await supabase
          .from('slugs')
          .select('id, display_name');

        if (slugError) throw slugError;

        const results: { slug_name: string; count: number }[] = [];

        for (const slug of slugs || []) {
          const { count, error } = await supabase
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', false)
            .eq('slug_id', slug.id);

          if (error) throw error;

          results.push({
            slug_name: slug.display_name,
            count: count ?? 0,
          });
        }

        return results;
      } catch {
        return null;
      }
    })(),

    // 5. Usage by initiative
    (async () => {
      try {
        const { data: initiatives, error: initError } = await supabase
          .from('initiatives')
          .select('id, name');

        if (initError) throw initError;

        const results: { initiative_name: string; count: number }[] = [];

        for (const init of initiatives || []) {
          const { count, error } = await supabase
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', false)
            .eq('initiative_id', init.id);

          if (error) throw error;

          results.push({
            initiative_name: init.name,
            count: count ?? 0,
          });
        }

        // Count assets with no initiative
        const { count: noInitCount, error: noInitError } = await supabase
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .is('initiative_id', null);

        if (noInitError) throw noInitError;

        results.push({
          initiative_name: 'ללא קמפיין',
          count: noInitCount ?? 0,
        });

        return results;
      } catch {
        return null;
      }
    })(),

    // 6. Upload trends (last 30 days)
    (async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: assets, error } = await supabase
          .from('assets')
          .select('upload_date')
          .eq('is_archived', false)
          .gte('upload_date', fromDate)
          .order('upload_date', { ascending: true });

        if (error) throw error;

        // Group by date
        const dateMap: Record<string, number> = {};
        for (const a of assets || []) {
          const date = a.upload_date?.split('T')[0];
          if (date) {
            dateMap[date] = (dateMap[date] || 0) + 1;
          }
        }

        // Fill in all 30 days (including days with 0 uploads)
        const result: { date: string; count: number }[] = [];
        const current = new Date(thirtyDaysAgo);
        const today = new Date();
        while (current <= today) {
          const dateStr = current.toISOString().split('T')[0];
          result.push({ date: dateStr, count: dateMap[dateStr] || 0 });
          current.setDate(current.getDate() + 1);
        }

        return result;
      } catch {
        return null;
      }
    })(),

    // 7. File type breakdown
    (async () => {
      try {
        const { data: assets, error } = await supabase
          .from('assets')
          .select('file_type')
          .eq('is_archived', false);

        if (error) throw error;

        const typeMap: Record<string, number> = {};
        for (const a of assets || []) {
          const ft = a.file_type || 'unknown';
          typeMap[ft] = (typeMap[ft] || 0) + 1;
        }

        return Object.entries(typeMap).map(([type, count]) => ({ type, count }));
      } catch {
        return null;
      }
    })(),

    // 8. Platform breakdown
    (async () => {
      try {
        const knownPlatforms = [
          'meta',
          'google',
          'tiktok',
          'linkedin',
          'twitter',
          'organic',
          'taboola',
          'outbrain',
        ];

        const counts = await Promise.all(
          knownPlatforms.map(async (platform) => {
            const { count, error } = await supabase
              .from('assets')
              .select('id', { count: 'exact', head: true })
              .eq('is_archived', false)
              .contains('platforms', [platform]);

            if (error) throw error;

            return { platform, count: count ?? 0 };
          })
        );

        return counts;
      } catch {
        return null;
      }
    })(),
  ]);

  return NextResponse.json({
    topDownloadedAssets,
    zeroResultSearches,
    neverDownloadedCount,
    usageBySlugs,
    usageByInitiative,
    uploadTrends,
    fileTypeBreakdown,
    platformBreakdown,
  });
}
