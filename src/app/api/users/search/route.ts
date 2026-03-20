import { NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET active users for reviewer selection (any authenticated user)
// Returns minimal data: id, email, display_name
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, display_name')
    .eq('is_active', true)
    .neq('role', 'deleted')
    .order('display_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: (data || []).map(u => ({
      id: u.id,
      email: u.email || '',
      display_name: u.display_name,
    })),
  });
}
