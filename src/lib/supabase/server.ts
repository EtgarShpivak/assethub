import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { UserPermissions } from '@/lib/types';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component context
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Security helper: get current user from request cookies
export async function getAuthUser() {
  const client = createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// Security helper: check if current user can manage users (replaces isAdminUser)
// Checks can_manage_users permission OR legacy role === 'admin'
export async function isAdminUser() {
  const user = await getAuthUser();
  if (!user) return false;
  const serviceClient = createServiceRoleClient();
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role, permissions')
    .eq('id', user.id)
    .single();
  if (!profile) return false;
  const perms = profile.permissions as UserPermissions | null;
  // Check new permissions-based model first, fall back to legacy role
  return perms?.can_manage_users === true || profile.role === 'admin';
}

// Security helper: check if current user has a specific permission
export async function hasPermission(permissionKey: keyof UserPermissions): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const serviceClient = createServiceRoleClient();
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role, permissions')
    .eq('id', user.id)
    .single();
  if (!profile) return false;
  const perms = profile.permissions as UserPermissions | null;
  // Admin role always has all permissions (backward compat)
  if (profile.role === 'admin') return true;
  return perms?.[permissionKey] === true;
}
