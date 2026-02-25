import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('initiatives')
    .select('*, slugs(slug, display_name)')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Get assets for this initiative
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('initiative_id', params.id)
    .eq('is_archived', false)
    .order('upload_date', { ascending: false });

  return NextResponse.json({ ...data, assets: assets || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('initiatives')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('initiatives')
    .update({ status: 'archived' })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
