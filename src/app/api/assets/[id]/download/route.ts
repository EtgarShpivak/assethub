import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require authentication OR a valid share token
  const user = await getAuthUser();
  const shareToken = new URL(request.url).searchParams.get('share_token');

  if (!user && !shareToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Validate share token if provided (for unauthenticated access)
  if (!user && shareToken) {
    const { data: share } = await supabase
      .from('shares')
      .select('id, is_revoked, expires_at')
      .eq('token', shareToken)
      .single();

    if (!share || share.is_revoked || (share.expires_at && new Date(share.expires_at) < new Date())) {
      return NextResponse.json({ error: 'קישור שיתוף לא חוקי או פג תוקף' }, { status: 403 });
    }
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .select('drive_file_id, original_filename, stored_filename, mime_type, file_type, file_size_label, slug_id, workspace_id')
    .eq('id', params.id)
    .single();

  if (error || !asset?.drive_file_id) {
    return NextResponse.json({ error: 'קובץ לא נמצא' }, { status: 404 });
  }

  try {
    // Download file from Supabase Storage
    const { data, error: downloadError } = await supabase.storage
      .from('assets')
      .download(asset.drive_file_id);

    if (downloadError || !data) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json({ error: 'שגיאה בהורדת הקובץ' }, { status: 500 });
    }

    // Log download activity via centralized logger (non-blocking)
    const downloadFilename = asset.stored_filename || asset.original_filename;
    logActivity(request, {
      action: 'download',
      entityType: 'asset',
      entityId: params.id,
      entityName: downloadFilename,
      userId: user?.id || null,
      workspaceId: asset.workspace_id || null,
      metadata: {
        file_type: asset.file_type,
        file_size: asset.file_size_label,
        original_filename: asset.original_filename,
        via_share: !user && !!shareToken,
      },
    });

    // Convert Blob to ArrayBuffer for Vercel compatibility
    const arrayBuffer = await data.arrayBuffer();

    // Serve with stored_filename (convention name), fallback to original
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    if (asset.mime_type) headers.set('Content-Type', asset.mime_type);
    headers.set('Content-Length', arrayBuffer.byteLength.toString());
    // Security: prevent content sniffing
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(arrayBuffer, { headers });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'שגיאה בהורדת הקובץ' }, { status: 500 });
  }
}
