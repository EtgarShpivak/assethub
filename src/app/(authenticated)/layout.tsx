import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/app-layout';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppLayout
      userName={user.user_metadata?.full_name}
      userEmail={user.email}
    >
      {children}
    </AppLayout>
  );
}
