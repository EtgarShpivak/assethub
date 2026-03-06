import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET comments for an asset
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('asset_id');

  if (!assetId) return NextResponse.json({ error: 'asset_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('asset_comments')
    .select('*')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

// POST new comment
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { asset_id, content, parent_comment_id } = await request.json();

  if (!asset_id || !content?.trim()) {
    return NextResponse.json({ error: 'asset_id and content required' }, { status: 400 });
  }

  // Get user name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single();

  const userName = profile?.display_name || profile?.email || 'משתמש';

  const { data, error } = await supabase
    .from('asset_comments')
    .insert({
      asset_id,
      user_id: user.id,
      user_name: userName,
      content: content.trim(),
      parent_comment_id: parent_comment_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE comment
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('asset_comments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
