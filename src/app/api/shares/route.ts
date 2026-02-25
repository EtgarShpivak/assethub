import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Generate a random token without Node.js crypto module (Vercel compatible)
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

// Create a share link
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();

    const { asset_ids, expires_days, created_by, filters } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json({ error: 'נדרשים מזהי חומרים' }, { status: 400 });
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_days || 7));

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        token,
        asset_ids,
        filters: filters || null,
        expires_at: expiresAt.toISOString(),
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Share creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ token: data.token, expires_at: data.expires_at }, { status: 201 });
  } catch (err) {
    console.error('Share POST error:', err);
    return NextResponse.json({ error: 'שגיאה ביצירת קישור שיתוף' }, { status: 500 });
  }
}

// Validate a share link
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const { data: share, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !share) {
      return NextResponse.json({ error: 'קישור לא נמצא' }, { status: 404 });
    }

    // Check expiration
    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'פג תוקף הקישור', expired: true }, { status: 410 });
    }

    // Get the shared assets
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('*, slugs(slug, display_name), initiatives(name, short_code)')
      .in('id', share.asset_ids)
      .eq('is_archived', false);

    if (assetError) {
      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    // Update access count
    await supabase
      .from('share_links')
      .update({ access_count: (share.access_count || 0) + 1 })
      .eq('id', share.id);

    return NextResponse.json({
      assets: assets || [],
      filters: share.filters,
      expires_at: share.expires_at,
      total: assets?.length || 0,
    });
  } catch (err) {
    console.error('Share GET error:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת קישור' }, { status: 500 });
  }
}
