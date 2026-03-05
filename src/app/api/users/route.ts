import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isAdminUser, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';
import { logServerError } from '@/lib/error-logger-server';
import { DEFAULT_PERMISSIONS } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET all users (admin only) — enriched with inviter name and last sign-in
// Query params: ?filter=active|inactive|deleted&sort=name|last_login|created_at|email&dir=asc|desc
export async function GET(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה. רק מנהלי מערכת יכולים לגשת.' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all'; // all | active | inactive | deleted
  const sort = searchParams.get('sort') || 'display_name';
  const dir = searchParams.get('dir') === 'desc' ? false : true; // ascending by default

  let query = supabase.from('user_profiles').select('*');

  // Filter by status (soft-delete uses role='deleted' since is_deleted column doesn't exist)
  if (filter === 'active') {
    query = query.eq('is_active', true).neq('role', 'deleted');
  } else if (filter === 'inactive') {
    query = query.eq('is_active', false).neq('role', 'deleted');
  } else if (filter === 'deleted') {
    query = query.eq('role', 'deleted');
  }
  // 'all' = no filter, returns everything including deleted

  // Sort — display_name and email can be sorted by DB; last_login needs post-processing
  if (sort === 'email' || sort === 'display_name') {
    query = query.order(sort, { ascending: dir });
  } else {
    // Default sort for other cases; enrichment will handle last_login/created_at sort
    query = query.order('display_name', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    await logServerError({
      context: 'users-list',
      errorMessage: `Failed to fetch user profiles: ${error.message}`,
      entityType: 'user',
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles = data || [];

  // Fetch all auth users in a single call (avoids N+1 getUserById calls that timeout on serverless)
  let authUsersMap = new Map<string, { last_sign_in_at: string | null; email: string | null; created_at: string | null }>();
  try {
    const { data: authList } = await supabase.auth.admin.listUsers();
    if (authList?.users) {
      authUsersMap = new Map(
        authList.users.map(u => [u.id, {
          last_sign_in_at: u.last_sign_in_at || null,
          email: u.email || null,
          created_at: u.created_at || null,
        }])
      );
    }
  } catch {
    // Auth listing failed — continue without enrichment
  }

  // Build a lookup map for resolving invited_by UUIDs to display names
  const profileMap = new Map(profiles.map(p => [p.id, p.display_name || p.email || 'משתמש']));

  // Enrich each profile (no async calls needed — all data from single listUsers)
  const enrichedProfiles = profiles.map((profile) => {
    let invitedByName: string | null = null;
    if (profile.invited_by) {
      invitedByName = profileMap.get(profile.invited_by)
        || authUsersMap.get(profile.invited_by)?.email
        || null;
    }

    const authInfo = authUsersMap.get(profile.id);
    const lastSignIn = authInfo?.last_sign_in_at || null;
    const authCreatedAt = authInfo?.created_at || null;

    return {
      ...profile,
      invited_by_name: invitedByName,
      last_sign_in_at: lastSignIn,
      created_at: authCreatedAt,
    };
  });

  // Post-processing sort for last_login and created_at (not in DB)
  if (sort === 'last_login') {
    enrichedProfiles.sort((a, b) => {
      const aDate = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const bDate = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return dir ? aDate - bDate : bDate - aDate;
    });
  } else if (sort === 'created_at') {
    enrichedProfiles.sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dir ? aDate - bDate : bDate - aDate;
    });
  }

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

  const { email, permissions, invited_by } = body;

  if (!email) {
    return NextResponse.json({ error: 'כתובת מייל נדרשת' }, { status: 400 });
  }

  const finalPermissions = permissions || DEFAULT_PERMISSIONS;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app';

  // Check if user already exists in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  // Also check if there's a soft-deleted profile for this email
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    // User exists in auth — update/reactivate their profile and generate a new invite link
    const wasDeleted = existingProfile?.role === 'deleted';
    const upsertData: Record<string, unknown> = {
      id: existingUser.id,
      display_name: existingProfile?.display_name || existingUser.user_metadata?.full_name || email.split('@')[0],
      email,
      role: wasDeleted ? 'viewer' : (existingProfile?.role || 'viewer'),
      permissions: finalPermissions,
      is_active: true,
      invited_by: invited_by || existingProfile?.invited_by || null,
    };

    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert(upsertData);

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

    await logActivity(request, {
      action: 'create',
      entityType: 'user',
      entityId: existingUser.id,
      entityName: email,
      userId: currentUser?.id,
      metadata: { permissions: finalPermissions, re_invited: true, reactivated: wasDeleted },
    });

    return NextResponse.json({ id: existingUser.id, updated: true, invite_link: inviteLink });
  }

  // New user: create user with temp password, then generate invite link
  const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!';
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
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

  // Create profile — if soft-deleted profile exists for this email, reuse it
  const profileData = {
    id: authData.user.id,
    display_name: email.split('@')[0],
    email,
    role: 'viewer',
    workspace_ids: workspaceIds,
    permissions: finalPermissions,
    invited_by: invited_by || null,
    is_active: true,
  };

  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert(profileData);

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Generate invite link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  let inviteLink = '';
  if (!linkError && linkData?.properties?.hashed_token) {
    inviteLink = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery`;
  }

  await logActivity(request, {
    action: 'create',
    entityType: 'user',
    entityId: authData.user.id,
    entityName: email,
    userId: currentUser?.id,
    metadata: { permissions: finalPermissions, invited: true },
  });

  return NextResponse.json({ id: authData.user.id, created: true, invite_link: inviteLink }, { status: 201 });
}

// PATCH - update user permissions/status (admin only)
export async function PATCH(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const currentUser = await getAuthUser();
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { user_id, permissions, is_active } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role, display_name, email, permissions')
    .eq('id', user_id)
    .single();

  // Prevent modifying another user who has can_manage_users (unless it's yourself)
  const targetPerms = targetUser?.permissions as Record<string, boolean> | null;
  if ((targetPerms?.can_manage_users || targetUser?.role === 'admin') && user_id !== currentUser?.id) {
    return NextResponse.json({ error: 'לא ניתן לשנות הרשאות של מנהל מערכת אחר' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (permissions !== undefined) updateData.permissions = permissions;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const actionDetail = is_active !== undefined
    ? (is_active ? 'activate' : 'deactivate')
    : 'edit';

  await logActivity(request, {
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

// DELETE - soft-delete user (admin only) — marks as deleted, preserves history
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

  if (userId === currentUser?.id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 });
  }

  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role, email, display_name, permissions')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }

  // Prevent deleting users with can_manage_users permission
  const targetPerms = targetUser.permissions as Record<string, boolean> | null;
  if (targetPerms?.can_manage_users || targetUser.role === 'admin') {
    return NextResponse.json({ error: 'לא ניתן למחוק מנהל מערכת. ניתן רק להשבית אותו.' }, { status: 403 });
  }

  // Soft delete: set role='deleted' and is_active=false, store deletion metadata in permissions
  const existingPerms = (targetUser.permissions as Record<string, unknown>) || {};
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      role: 'deleted',
      is_active: false,
      permissions: {
        ...existingPerms,
        _deleted_at: new Date().toISOString(),
        _deleted_by: currentUser?.id || null,
      },
    })
    .eq('id', userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete from Supabase Auth (prevents login but profile remains)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('Auth deletion error (profile soft-deleted):', authError);
  }

  await logActivity(request, {
    action: 'delete',
    entityType: 'user',
    entityId: userId,
    entityName: targetUser.display_name || targetUser.email || userId,
    userId: currentUser?.id,
    metadata: { deleted_email: targetUser.email, soft_delete: true },
  });

  return NextResponse.json({ deleted: true, email: targetUser.email });
}
