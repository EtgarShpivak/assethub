import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from('initiatives')
    .select('*, slugs(slug, display_name), assets:assets(count)')
    .order('created_at', { ascending: false });

  const slugId = searchParams.get('slug_id');
  if (slugId) {
    query = query.eq('slug_id', slugId);
  }

  const status = searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transformed = (data || []).map((i: Record<string, unknown>) => ({
    ...i,
    asset_count: Array.isArray(i.assets) ? (i.assets[0] as { count: number })?.count || 0 : 0,
    assets: undefined,
  }));

  return NextResponse.json(transformed);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { name, short_code, slug_id, workspace_id, start_date, end_date, notes, tags } = body;

  if (!name || !short_code || !workspace_id) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים: name, short_code, workspace_id' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('initiatives')
    .insert({
      name,
      short_code: short_code.toLowerCase().replace(/[^a-z0-9]/g, ''),
      slug_id: slug_id || null,  // nullable for cross-slug initiatives
      workspace_id,
      start_date: start_date || null,
      end_date: end_date || null,
      notes: notes || null,
      tags: tags || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
