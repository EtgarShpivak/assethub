import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Rate limit unauthenticated token validation (10 requests per minute per IP)
  const ip = getClientIp(_request);
  const { allowed } = rateLimit(`token-validate:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createServiceRoleClient();

  const { data: tokenData, error } = await supabase
    .from('upload_tokens')
    .select('*, slugs(slug, display_name), initiatives(name, short_code), workspaces(name, slug_prefix)')
    .eq('token', params.token)
    .single();

  if (error || !tokenData) {
    return NextResponse.json({ valid: false, error: 'טוקן לא חוקי' }, { status: 404 });
  }

  if (tokenData.is_revoked) {
    return NextResponse.json({ valid: false, error: 'טוקן זה בוטל' }, { status: 403 });
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'טוקן זה פג תוקף' }, { status: 403 });
  }

  return NextResponse.json({
    valid: true,
    workspace_id: tokenData.workspace_id,
    slug_id: tokenData.slug_id,
    initiative_id: tokenData.initiative_id,
    workspace_name: (tokenData.workspaces as { name: string })?.name,
    slug_name: (tokenData.slugs as { display_name: string })?.display_name,
    initiative_name: (tokenData.initiatives as { name: string })?.name,
  });
}
