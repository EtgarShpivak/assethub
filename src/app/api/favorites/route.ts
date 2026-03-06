import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — list current user's favorite asset IDs
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('favorites')
    .select('asset_id')
    .eq('user_id', user.id);

  if (error) {
    // Table might not exist yet — return empty
    return NextResponse.json([]);
  }

  return NextResponse.json(data.map(f => f.asset_id));
}

// POST — toggle favorite for an asset
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { asset_id } = body as { asset_id: string };
  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 });

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('asset_id', asset_id)
    .maybeSingle();

  if (existing) {
    // Remove favorite
    await supabase.from('favorites').delete().eq('id', existing.id);
    return NextResponse.json({ favorited: false });
  } else {
    // Add favorite
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      asset_id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ favorited: true });
  }
}
