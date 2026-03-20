import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

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

// List approval rounds created by current user
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_reviewers(id, email, display_name, status, responded_at, token),
      approval_round_assets(id, asset_id, round_number)
    `)
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rounds: data || [] });
}

// Create a new approval round
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { title, description, workspace_id, asset_ids, reviewers } = body as {
    title: string;
    description?: string;
    workspace_id: string;
    asset_ids: string[];
    reviewers: { email: string; display_name?: string }[];
  };

  if (!title || !workspace_id || !asset_ids?.length || !reviewers?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create the round
  const { data: round, error: roundError } = await supabase
    .from('approval_rounds')
    .insert({
      workspace_id,
      title,
      description: description || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (roundError) return NextResponse.json({ error: roundError.message }, { status: 500 });

  // Add assets
  const assetRows = asset_ids.map(aid => ({
    round_id: round.id,
    asset_id: aid,
    round_number: 1,
  }));
  await supabase.from('approval_round_assets').insert(assetRows);

  // Add reviewers with unique tokens; auto-match internal users
  const reviewerRows = [];
  for (const r of reviewers) {
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .eq('email', r.email)
      .single();

    reviewerRows.push({
      round_id: round.id,
      email: r.email,
      display_name: r.display_name || existingUser?.display_name || null,
      user_id: existingUser?.id || null,
      token: generateToken(),
    });
  }
  const { data: savedReviewers } = await supabase
    .from('approval_reviewers')
    .insert(reviewerRows)
    .select();

  // Log activity
  await logActivity(request, {
    action: 'create',
    entityType: 'approval',
    entityId: round.id,
    entityName: title,
    userId: user.id,
    workspaceId: workspace_id,
    metadata: { asset_count: asset_ids.length, reviewer_count: reviewers.length },
  });

  return NextResponse.json({
    round,
    reviewers: savedReviewers,
    review_links: savedReviewers?.map(r => ({
      email: r.email,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app'}/approve/${r.token}`,
    })),
  }, { status: 201 });
}
