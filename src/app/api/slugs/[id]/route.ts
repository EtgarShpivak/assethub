import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('slugs')
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

  // Check for associated assets
  const { count } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('slug_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'לא ניתן למחוק סלאג שיש לו חומרים משויכים. העבר לארכיון במקום.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('slugs')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
