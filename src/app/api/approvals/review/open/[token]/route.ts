import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
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

// Public: view approval round by open token (anyone can view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`open-review:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  // Find round by open token
  const { data: round, error } = await supabase
    .from('approval_rounds')
    .select(`
      id, title, description, status, current_round_number, created_by, created_at, open_token,
      approval_round_assets(
        id, asset_id, round_number, added_at,
        assets(id, original_filename, stored_filename, file_type, mime_type,
               file_size_label, width_px, height_px, dimensions_label,
               drive_view_url, domain_context)
      ),
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_comments(id, author_name, content, round_number, created_at)
    `)
    .eq('open_token', token)
    .single();

  if (error || !round) {
    return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });
  }

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
    is_open: true,
  });
}

// Public: submit review via open link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`open-review-respond:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  // Find round by open token
  const { data: round } = await supabase
    .from('approval_rounds')
    .select('id, title, current_round_number, open_token')
    .eq('open_token', token)
    .single();

  if (!round) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });

  const body = await request.json();
  const { action, comment, display_name, email } = body as {
    action: 'approved' | 'changes_requested';
    comment?: string;
    display_name?: string;
    email?: string;
  };

  if (!action || !['approved', 'changes_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (!display_name?.trim()) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
  }

  const nameToUse = display_name.trim();
  const emailToUse = email?.trim() || `anonymous-${Date.now()}@open-review`;

  // Check if this person already reviewed (by email)
  const { data: existingReviewer } = await supabase
    .from('approval_reviewers')
    .select('id')
    .eq('round_id', round.id)
    .eq('email', emailToUse)
    .single();

  let reviewerId: string;

  if (existingReviewer) {
    // Update existing review
    reviewerId = existingReviewer.id;
    await supabase
      .from('approval_reviewers')
      .update({
        status: action,
        display_name: nameToUse,
        responded_at: new Date().toISOString(),
      })
      .eq('id', existingReviewer.id);
  } else {
    // Create new reviewer entry on the fly
    const { data: newReviewer } = await supabase
      .from('approval_reviewers')
      .insert({
        round_id: round.id,
        email: emailToUse,
        display_name: nameToUse,
        user_id: null,
        token: generateToken(),
        status: action,
        responded_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    reviewerId = newReviewer?.id || '';
  }

  // Add comment if provided
  if (comment?.trim()) {
    await supabase.from('approval_comments').insert({
      round_id: round.id,
      reviewer_id: reviewerId,
      user_id: null,
      author_name: nameToUse,
      content: comment.trim(),
      round_number: round.current_round_number || 1,
    });
  }

  // Re-check all reviewer statuses for this round
  const { data: allReviewers } = await supabase
    .from('approval_reviewers')
    .select('status')
    .eq('round_id', round.id);

  const allApproved = allReviewers?.length && allReviewers.every(r => r.status === 'approved');
  const anyChanges = allReviewers?.some(r => r.status === 'changes_requested');
  const newRoundStatus = allApproved ? 'approved' : anyChanges ? 'changes_requested' : 'pending';

  await supabase
    .from('approval_rounds')
    .update({ status: newRoundStatus, updated_at: new Date().toISOString() })
    .eq('id', round.id);

  // Audit trail
  const userAgent = request.headers.get('user-agent') || 'unknown';
  await logActivity(request, {
    action: action === 'approved' ? 'approve' : 'request_changes',
    entityType: 'approval',
    entityId: round.id,
    entityName: nameToUse,
    metadata: {
      reviewer_email: emailToUse,
      ip,
      user_agent: userAgent,
      round_status: newRoundStatus,
      comment: comment?.trim() || null,
      open_link: true,
    },
  });

  return NextResponse.json({ success: true, round_status: newRoundStatus });
}
