import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch dashboard stats
  const [
    assetsResult,
    initiativesResult,
    recentAssetsResult,
    activeInitiativesResult,
    unclassifiedResult,
    slugsResult,
    uploadsThisWeek,
    uploadsThisMonth,
    imageCount,
    videoCount,
    pdfCount,
  ] = await Promise.all([
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('initiatives').select('*', { count: 'exact', head: true }).in('status', ['active', 'ongoing']),
    supabase.from('assets').select('*, slugs(display_name, slug)').eq('is_archived', false).order('upload_date', { ascending: false }).limit(20),
    supabase.from('initiatives').select('*, slugs(display_name, slug)').in('status', ['active', 'ongoing']).order('created_at', { ascending: false }).limit(20),
    supabase.from('assets').select('*', { count: 'exact', head: true })
      .or('platforms.is.null,platforms.eq.{}')
      .gte('upload_date', weekAgo),
    supabase.from('slugs').select('id, slug, display_name').eq('is_archived', false).order('display_name'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false).gte('upload_date', weekAgo),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false).gte('upload_date', monthAgo),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('file_type', 'image'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('file_type', 'video'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('file_type', 'pdf'),
  ]);

  return (
    <DashboardClient
      totalAssets={assetsResult.count || 0}
      activeInitiatives={initiativesResult.count || 0}
      unclassifiedCount={unclassifiedResult.count || 0}
      recentAssets={recentAssetsResult.data || []}
      initiatives={activeInitiativesResult.data || []}
      slugs={slugsResult.data || []}
      uploadsThisWeek={uploadsThisWeek.count || 0}
      uploadsThisMonth={uploadsThisMonth.count || 0}
      imageCount={imageCount.count || 0}
      videoCount={videoCount.count || 0}
      pdfCount={pdfCount.count || 0}
    />
  );
}
