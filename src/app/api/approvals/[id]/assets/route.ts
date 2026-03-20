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
  const { asset_ids } = body as { asset_ids: string[] };

  // Verify ownership
  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by, current_round_number')
    .eq('id', id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const newRoundNumber = round.current_round_number + 1;

  // Add new assets
  const rows = asset_ids.map(aid => ({
    round_id: id,
    asset_id: aid,
    round_number: newRoundNumber,
  }));
  await supabase.from('approval_round_assets').insert(rows);

  // Update round number and reset to pending
  await supabase
    .from('approval_rounds')
    .update({
      current_round_number: newRoundNumber,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Reset all reviewers to pending
  await supabase
    .from('approval_reviewers')
    .update({ status: 'pending', responded_at: null })
    .eq('round_id', id);

  return NextResponse.json({ round_number: newRoundNumber });
}
