import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Get full approval round details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: round, error } = await supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_round_assets(
        id, asset_id, round_number, added_at,
        assets(id, original_filename, stored_filename, file_type, mime_type,
               file_size_label, width_px, height_px, dimensions_label,
               aspect_ratio, drive_view_url, domain_context, platforms, tags)
      ),
      approval_reviewers(id, email, display_name, user_id, token, status, responded_at),
      approval_comments(id, author_name, content, round_number, created_at, reviewer_id, user_id)
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Verify access: creator or reviewer
  const isCreator = round.created_by === user.id;
  const isReviewer = round.approval_reviewers?.some(
    (r: { user_id: string | null }) => r.user_id === user.id
  );
  if (!isCreator && !isReviewer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get creator name
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', round.created_by)
    .single();

  return NextResponse.json({
    ...round,
    creator_name: creator?.display_name || 'Unknown',
  });
}

// Update round (title, description, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  // Verify ownership
  const { data: existing } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ALLOWED = new Set(['title', 'description', 'status']);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(body)) {
    if (ALLOWED.has(key)) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('approval_rounds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Delete round
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('approval_rounds')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
