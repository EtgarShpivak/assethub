import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();

  const { data: asset, error } = await supabase
    .from('assets')
    .select('drive_file_id, original_filename, mime_type')
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

    // Log download activity (non-blocking)
    getAuthUser().then(user => {
      if (user) {
        supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'download',
          entity_type: 'asset',
          entity_id: params.id,
          entity_name: asset.original_filename,
        }).then(() => {});
      }
    }).catch(() => {});

    // Convert Blob to ArrayBuffer for Vercel compatibility
    const arrayBuffer = await data.arrayBuffer();

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(asset.original_filename)}"`);
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
