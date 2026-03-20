import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public: view approval round by reviewer token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`approval-review:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  // Find reviewer by token
  const { data: reviewer, error: revErr } = await supabase
    .from('approval_reviewers')
    .select('*')
    .eq('token', token)
    .single();

  if (revErr || !reviewer) {
    return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });
  }

  // Get the full round with assets, reviewers, comments
  const { data: round } = await supabase
    .from('approval_rounds')
    .select(`
      id, title, description, status, current_round_number, created_by, created_at,
      approval_round_assets(
        id, asset_id, round_number, added_at,
        assets(id, original_filename, stored_filename, file_type, mime_type,
               file_size_label, width_px, height_px, dimensions_label,
               drive_view_url, domain_context)
      ),
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_comments(id, author_name, content, round_number, created_at)
    `)
    .eq('id', reviewer.round_id)
    .single();

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  // Get creator name
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', round.created_by)
    .single();

  return NextResponse.json({
    round: {
      ...round,
      creator_name: creator?.display_name || 'Unknown',
    },
    my_reviewer_id: reviewer.id,
    my_status: reviewer.status,
    my_display_name: reviewer.display_name,
  });
}

// Public: submit approval/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`approval-respond:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  const { data: reviewer } = await supabase
    .from('approval_reviewers')
    .select('*')
    .eq('token', token)
    .single();

  if (!reviewer) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });

  const body = await request.json();
  const { action, comment, display_name } = body as {
    action: 'approved' | 'changes_requested';
    comment?: string;
    display_name?: string;
  };

  if (!action || !['approved', 'changes_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update reviewer name if provided (external user first time)
  const nameToUse = display_name || reviewer.display_name || reviewer.email.split('@')[0];

  // Update reviewer status
  await supabase
    .from('approval_reviewers')
    .update({
      status: action,
      display_name: nameToUse,
      responded_at: new Date().toISOString(),
    })
    .eq('id', reviewer.id);

  // Add comment if provided
  if (comment?.trim()) {
    const { data: round } = await supabase
      .from('approval_rounds')
      .select('current_round_number')
      .eq('id', reviewer.round_id)
      .single();

    await supabase.from('approval_comments').insert({
      round_id: reviewer.round_id,
      reviewer_id: reviewer.id,
      user_id: reviewer.user_id || null,
      author_name: nameToUse,
      content: comment.trim(),
      round_number: round?.current_round_number || 1,
    });
  }

  // Check if all reviewers approved -> update round status
  const { data: allReviewers } = await supabase
    .from('approval_reviewers')
    .select('status')
    .eq('round_id', reviewer.round_id);

  const allApproved = allReviewers?.every(r => r.status === 'approved');
  const anyChanges = allReviewers?.some(r => r.status === 'changes_requested');

  const newRoundStatus = allApproved ? 'approved' : anyChanges ? 'changes_requested' : 'pending';

  await supabase
    .from('approval_rounds')
    .update({ status: newRoundStatus, updated_at: new Date().toISOString() })
    .eq('id', reviewer.round_id);

  return NextResponse.json({ success: true, round_status: newRoundStatus });
}
