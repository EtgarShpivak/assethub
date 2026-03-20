import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

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

// Add reviewer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, display_name } = body;

  // Check if already a reviewer
  const { data: existing } = await supabase
    .from('approval_reviewers')
    .select('id')
    .eq('round_id', id)
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Reviewer already added' }, { status: 409 });
  }

  // Auto-match internal users
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .eq('email', email)
    .single();

  const { data: reviewer, error } = await supabase
    .from('approval_reviewers')
    .insert({
      round_id: id,
      email,
      display_name: display_name || existingUser?.display_name || null,
      user_id: existingUser?.id || null,
      token: generateToken(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reviewer,
    review_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app'}/approve/${reviewer.token}`,
  }, { status: 201 });
}

// Remove reviewer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reviewerId = searchParams.get('reviewer_id');
  if (!reviewerId) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 });

  await supabase
    .from('approval_reviewers')
    .delete()
    .eq('id', reviewerId)
    .eq('round_id', id);

  return NextResponse.json({ success: true });
}
