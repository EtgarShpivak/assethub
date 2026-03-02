import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Called after login/signup to ensure user_profiles row exists
// Only the authenticated user can create their own profile
export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .single();

  if (existing) {
    // Update email if missing
    if (user.email) {
      await supabase.from('user_profiles').update({ email: user.email }).eq('id', user.id).is('email', null);
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

  // Create profile — only for the authenticated user's own ID
  const { error } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email || 'משתמש',
      email: user.email || null,
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
