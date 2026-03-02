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

  const { data: slugs, error } = await supabase
    .from('slugs')
    .select(`
      *,
      assets:assets(count),
      initiatives:initiatives(count)
    `)
    .order('slug', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform count aggregations
  const transformed = slugs.map((s: Record<string, unknown>) => ({
    ...s,
    asset_count: Array.isArray(s.assets) ? (s.assets[0] as { count: number })?.count || 0 : 0,
    initiative_count: Array.isArray(s.initiatives) ? (s.initiatives[0] as { count: number })?.count || 0 : 0,
    assets: undefined,
    initiatives: undefined,
  }));

  return NextResponse.json(transformed);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { slug, display_name, description, workspace_id } = body;

  if (!slug || !display_name || !workspace_id) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים: slug, display_name, workspace_id' },
      { status: 400 }
    );
  }

  // Validate slug format: lowercase, hyphens only
  const slugRegex = /^[a-z][a-z0-9-]*$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      { error: 'הסלאג חייב להכיל רק אותיות קטנות באנגלית, מספרים ומקפים' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('slugs')
    .insert({
      slug,
      display_name,
      description: description || null,
      workspace_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'סלאג זה כבר קיים במערכת' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(request, {
    action: 'create',
    entityType: 'slug',
    entityId: data.id,
    entityName: data.display_name,
    userId: user.id,
    workspaceId: workspace_id,
    metadata: { slug: data.slug, display_name: data.display_name, description: data.description },
  });

  return NextResponse.json(data, { status: 201 });
}
