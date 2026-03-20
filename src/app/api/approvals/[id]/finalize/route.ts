import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Verify ownership and all-approved status
  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by, status, workspace_id, title')
    .eq('id', id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (round.status !== 'approved') {
    return NextResponse.json({ error: 'Round not fully approved yet' }, { status: 400 });
  }

  // Get all asset IDs in this round
  const { data: roundAssets } = await supabase
    .from('approval_round_assets')
    .select('asset_id')
    .eq('round_id', id);

  const assetIds = roundAssets?.map(ra => ra.asset_id) || [];

  // Move assets from draft to production
  await supabase
    .from('assets')
    .update({ asset_type: 'production' })
    .in('id', assetIds);

  // Log activity
  await logActivity(request, {
    action: 'edit',
    entityType: 'approval',
    entityId: id,
    entityName: round.title,
    userId: user.id,
    workspaceId: round.workspace_id,
    metadata: { action: 'finalize', asset_count: assetIds.length },
  });

  return NextResponse.json({ success: true, finalized_count: assetIds.length });
}
