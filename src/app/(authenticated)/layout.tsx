import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/app-layout';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (err) {
    console.error('Auth check failed:', err);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  // Fetch user role for admin features
  let userRole: string = 'viewer';
  try {
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role || 'viewer';
  } catch {
    // Default to viewer if role fetch fails
  }

  return (
    <AppLayout
      userName={user.user_metadata?.full_name}
      userEmail={user.email}
      userRole={userRole}
    >
      {children}
    </AppLayout>
  );
}
