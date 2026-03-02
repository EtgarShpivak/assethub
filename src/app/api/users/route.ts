import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isAdminUser, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET all users (admin only) — enriched with inviter name and last sign-in
export async function GET() {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה. רק מנהלי מערכת יכולים לגשת.' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles = data || [];

  // Build a lookup map for resolving invited_by UUIDs to display names
  const profileMap = new Map(profiles.map(p => [p.id, p.display_name || p.email || 'משתמש']));

  // Enrich each profile with invited_by_name and last_sign_in_at
  const enrichedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      // Resolve invited_by name
      const invitedByName = profile.invited_by
        ? profileMap.get(profile.invited_by) || null
        : null;

      // If inviter not in profiles map (e.g., deleted), try to resolve from auth
      let finalInviterName = invitedByName;
      if (profile.invited_by && !invitedByName) {
        try {
          const { data: inviterAuth } = await supabase.auth.admin.getUserById(profile.invited_by);
          finalInviterName = inviterAuth?.user?.email || null;
        } catch {
          // Ignore — inviter may have been deleted
        }
      }

      // Get last sign-in from Supabase Auth
      let lastSignIn: string | null = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        lastSignIn = authUser?.user?.last_sign_in_at || null;
      } catch {
        // Auth lookup failed
      }

      return {
        ...profile,
        invited_by_name: finalInviterName,
        last_sign_in_at: lastSignIn,
      };
    })
  );

  return NextResponse.json(enrichedProfiles);
}

// POST - invite user by email (admin only)
export async function POST(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const currentUser = await getAuthUser();
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { email, role, permissions, view_filters, invited_by } = body;

  if (!email) {
    return NextResponse.json({ error: 'כתובת מייל נדרשת' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app';

  // Check if user already exists in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    // User exists in auth — update their profile and generate a new invite link
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: existingUser.id,
        display_name: existingUser.user_metadata?.full_name || email.split('@')[0],
        email,
        role: role || 'viewer',
        permissions: permissions || {},
        view_filters: view_filters || null,
        is_active: true,
        invited_by: invited_by || null,
      });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Generate a recovery link so user can set their own password
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    let inviteLink = '';
    if (!linkError && linkData?.properties?.hashed_token) {
      inviteLink = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery`;
    }

    // Log the invite/re-invite
    logActivity(request, {
      action: 'create',
      entityType: 'user',
      entityId: existingUser.id,
      entityName: email,
      userId: currentUser?.id,
      metadata: { role: role || 'viewer', re_invited: true },
    });

    return NextResponse.json({ id: existingUser.id, updated: true, invite_link: inviteLink });
  }

  // New user: create user with temp password, then generate invite link
  const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!';
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // Mark email as confirmed so they can log in after setting password
  });

  if (authError) {
    console.error('Create user error:', authError);
    return NextResponse.json({ error: `שגיאה ביצירת משתמש: ${authError.message}` }, { status: 500 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'שגיאה ביצירת משתמש' }, { status: 500 });
  }

  // Get workspace
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);

  const workspaceIds = workspaces?.length ? [workspaces[0].id] : [];

  // Create profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      display_name: email.split('@')[0],
      email,
      role: role || 'viewer',
      workspace_ids: workspaceIds,
      permissions: permissions || {},
      view_filters: view_filters || null,
      invited_by: invited_by || null,
      is_active: true,
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Generate invite link (recovery type so user can set their own password)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  let inviteLink = '';
  if (!linkError && linkData?.properties?.hashed_token) {
    inviteLink = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery`;
  }

  // Log the invite
  logActivity(request, {
    action: 'create',
    entityType: 'user',
    entityId: authData.user.id,
    entityName: email,
    userId: currentUser?.id,
    metadata: { role: role || 'viewer', invited: true },
  });

  return NextResponse.json({ id: authData.user.id, created: true, invite_link: inviteLink }, { status: 201 });
}

// PATCH - update user permissions (admin only)
export async function PATCH(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const currentUser = await getAuthUser();
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { user_id, role, permissions, view_filters, is_active } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Prevent modifying another admin's role (admins can only be modified by themselves)
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role, display_name, email')
    .eq('id', user_id)
    .single();

  if (targetUser?.role === 'admin' && user_id !== currentUser?.id) {
    return NextResponse.json({ error: 'לא ניתן לשנות הרשאות של מנהל מערכת אחר' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (permissions !== undefined) updateData.permissions = permissions;
  if (view_filters !== undefined) updateData.view_filters = view_filters;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the action
  const actionDetail = is_active !== undefined
    ? (is_active ? 'activate' : 'deactivate')
    : 'edit';

  logActivity(request, {
    action: actionDetail,
    entityType: 'user',
    entityId: user_id,
    entityName: targetUser?.display_name || targetUser?.email || user_id,
    userId: currentUser?.id,
    metadata: {
      changes: updateData,
      action_type: actionDetail,
    },
  });

  return NextResponse.json({ updated: true });
}

// DELETE - remove a non-admin user from the system (admin only)
export async function DELETE(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const currentUser = await getAuthUser();
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Prevent deleting yourself
  if (userId === currentUser?.id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 });
  }

  // Prevent deleting another admin
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role, email, display_name')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }

  if (targetUser.role === 'admin') {
    return NextResponse.json({ error: 'לא ניתן למחוק מנהל מערכת. ניתן רק להשבית אותו.' }, { status: 403 });
  }

  // Delete profile first
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Delete from Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('Auth deletion error (profile already deleted):', authError);
    // Profile was already deleted, just log the auth error
  }

  // Log the deletion
  logActivity(request, {
    action: 'delete',
    entityType: 'user',
    entityId: userId,
    entityName: targetUser.display_name || targetUser.email || userId,
    userId: currentUser?.id,
    metadata: { deleted_email: targetUser.email, deleted_role: targetUser.role },
  });

  return NextResponse.json({ deleted: true, email: targetUser.email });
}
