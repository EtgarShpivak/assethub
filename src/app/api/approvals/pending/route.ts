import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Find rounds where this user is a reviewer
  const { data: myReviews } = await supabase
    .from('approval_reviewers')
    .select('round_id, status, token')
    .eq('user_id', user.id);

  if (!myReviews?.length) {
    return NextResponse.json({ rounds: [] });
  }

  const roundIds = myReviews.map(r => r.round_id);

  const { data: rounds, error } = await supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_round_assets(id, asset_id, round_number)
    `)
    .in('id', roundIds)
    .in('status', ['pending', 'changes_requested'])
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Annotate each round with current user's review status
  const annotated = (rounds || []).map(round => ({
    ...round,
    my_status: myReviews.find(r => r.round_id === round.id)?.status || 'pending',
    my_token: myReviews.find(r => r.round_id === round.id)?.token,
  }));

  return NextResponse.json({ rounds: annotated });
}
