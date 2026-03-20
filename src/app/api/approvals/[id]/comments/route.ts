import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('current_round_number')
    .eq('id', id)
    .single();

  const { data: comment, error } = await supabase
    .from('approval_comments')
    .insert({
      round_id: id,
      user_id: user.id,
      author_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
      content: body.content,
      round_number: round?.current_round_number || 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(comment, { status: 201 });
}
