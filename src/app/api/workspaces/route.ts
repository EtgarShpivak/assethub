import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { name, slug_prefix } = body;

  if (!name || !slug_prefix) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, slug_prefix })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
