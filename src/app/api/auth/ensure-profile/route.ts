import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Called after login/signup to ensure user_profiles row exists
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { user_id, email, display_name } = await request.json();

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, is_active')
    .eq('id', user_id)
    .single();

  if (existing) {
    // Update email if missing
    if (email) {
      await supabase.from('user_profiles').update({ email }).eq('id', user_id).is('email', null);
    }
    return NextResponse.json({ exists: true, inactive: existing.is_active === false });
  }

  // Get the first workspace to auto-assign
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);

  const workspaceIds = workspaces && workspaces.length > 0
    ? [workspaces[0].id]
    : [];

  // Check if this is the first user (make them admin)
  const { count: userCount } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true });

  const isFirstUser = (userCount || 0) === 0;

  // Create profile
  const { error } = await supabase
    .from('user_profiles')
    .insert({
      id: user_id,
      display_name: display_name || email || 'משתמש',
      email: email || null,
      role: isFirstUser ? 'admin' : 'media_buyer',
      workspace_ids: workspaceIds,
      permissions: isFirstUser
        ? { can_upload: true, can_view: true, can_manage_initiatives: true }
        : { can_view: true },
      is_active: true,
    });

  if (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ created: true });
}
