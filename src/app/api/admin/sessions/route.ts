import { NextResponse } from 'next/server';
import { isAdminUser, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await isAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return NextResponse.json({ error: 'שגיאה בטעינת משתמשים' }, { status: 500 });
  }

  const users = (data?.users || [])
    .map((u) => ({
      display_name:
        u.user_metadata?.display_name ||
        u.user_metadata?.full_name ||
        u.email?.split('@')[0] ||
        'Unknown',
      email: u.email || '',
      last_sign_in_at: u.last_sign_in_at || null,
      created_at: u.created_at,
    }))
    .sort((a, b) => {
      const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return bTime - aTime;
    });

  return NextResponse.json(users);
}
