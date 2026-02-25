import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isAdminUser, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET all users (admin only)
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

  return NextResponse.json(data || []);
}

// POST - invite user by email (admin only)
export async function POST(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { email, role, permissions, view_filters, invited_by } = body;

  if (!email) {
    return NextResponse.json({ error: 'כתובת מייל נדרשת' }, { status: 400 });
  }

  // Create user via Supabase Auth admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-12) + 'A1!',  // Temp password
    email_confirm: true,
  });

  if (authError) {
    // User might already exist
    if (authError.message.includes('already been registered')) {
      // Get existing user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      if (existingUser) {
        // Update their profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            role: role || 'viewer',
            permissions: permissions || {},
            view_filters: view_filters || null,
            is_active: true,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ id: existingUser.id, updated: true });
      }
    }
    return NextResponse.json({ error: authError.message }, { status: 500 });
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

  // Send password reset so user can set their own password
  await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  return NextResponse.json({ id: authData.user.id, created: true }, { status: 201 });
}

// PATCH - update user permissions (admin only)
export async function PATCH(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { user_id, role, permissions, view_filters, is_active } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Prevent modifying another admin's role (admins can only be modified by themselves)
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user_id)
    .single();

  const currentUser = await getAuthUser();
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

  return NextResponse.json({ updated: true });
}

// DELETE - remove a non-admin user from the system (admin only)
export async function DELETE(request: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Prevent deleting yourself
  const currentUser = await getAuthUser();
  if (userId === currentUser?.id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 });
  }

  // Prevent deleting another admin
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('role, email')
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

  return NextResponse.json({ deleted: true, email: targetUser.email });
}
