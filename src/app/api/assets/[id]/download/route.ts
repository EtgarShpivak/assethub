import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    // drive_file_id stores the storage path (e.g., "ono/slug/standalone/uuid.ext")
    const { data, error: downloadError } = await supabase.storage
      .from('assets')
      .download(asset.drive_file_id);

    if (downloadError || !data) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json({ error: 'שגיאה בהורדת הקובץ' }, { status: 500 });
    }

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(asset.original_filename)}"`);
    if (asset.mime_type) headers.set('Content-Type', asset.mime_type);
    headers.set('Content-Length', data.size.toString());

    return new NextResponse(data, { headers });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'שגיאה בהורדת הקובץ' }, { status: 500 });
  }
}
