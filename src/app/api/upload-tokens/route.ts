import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('upload_tokens')
    .select('*, slugs(slug, display_name), initiatives(name, short_code)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { workspace_id, slug_id, initiative_id, expires_days } = body;

  if (!workspace_id || !slug_id) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expires_days || 30));

  const { data, error } = await supabase
    .from('upload_tokens')
    .insert({
      workspace_id,
      slug_id,
      initiative_id: initiative_id || null,
      created_by: user.id, // Always use authenticated user, not client-provided value
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Upload token creation error:', error.message);
    return NextResponse.json({ error: 'שגיאה ביצירת טוקן העלאה' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH — revoke an upload token
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();
  const { id, is_revoked } = body;

  if (!id) {
    return NextResponse.json({ error: 'חסר מזהה טוקן' }, { status: 400 });
  }

  const { error } = await supabase
    .from('upload_tokens')
    .update({ is_revoked: is_revoked ?? true })
    .eq('id', id);

  if (error) {
    console.error('Upload token revoke error:', error.message);
    return NextResponse.json({ error: 'שגיאה בביטול הטוקן' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
