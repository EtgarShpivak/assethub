import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_ASSETS_PER_ZIP = 100;

export async function POST(request: NextRequest) {
  // Require authentication OR a valid share token
  const user = await getAuthUser();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה לא תקין' }, { status: 400 });
  }
  const { asset_ids, share_token } = body as { asset_ids?: string[]; share_token?: string };

  // If not authenticated, require a valid share token
  if (!user && !share_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate share token if provided (for unauthenticated access)
  const supabase = createServiceRoleClient();

  if (!user && share_token) {
    const { data: share } = await supabase
      .from('shares')
      .select('id, is_revoked, expires_at')
      .eq('token', share_token)
      .single();

    if (!share || share.is_revoked || (share.expires_at && new Date(share.expires_at) < new Date())) {
      return NextResponse.json({ error: 'קישור שיתוף לא חוקי או פג תוקף' }, { status: 403 });
    }
  }

  if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
    return NextResponse.json(
      { error: 'נדרשת רשימת מזהי חומרים' },
      { status: 400 }
    );
  }

  // Limit number of assets to prevent OOM
  if (asset_ids.length > MAX_ASSETS_PER_ZIP) {
    return NextResponse.json(
      { error: `ניתן להוריד עד ${MAX_ASSETS_PER_ZIP} קבצים בבת אחת` },
      { status: 400 }
    );
  }

  // Get all selected assets
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, drive_file_id, original_filename, stored_filename, mime_type')
    .in('id', asset_ids);

  if (error || !assets) {
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים' }, { status: 500 });
  }

  // Create ZIP using JSZip (works on Vercel serverless)
  const zip = new JSZip();

  // Track filenames to avoid duplicates
  const usedNames = new Map<string, number>();

  for (const asset of assets) {
    if (!asset.drive_file_id) continue;

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('assets')
        .download(asset.drive_file_id);

      if (downloadError || !fileData) {
        console.error(`Failed to download file ${asset.drive_file_id}:`, downloadError);
        continue;
      }

      // Use stored_filename (smart name) for the zip entry
      let filename = asset.stored_filename || asset.original_filename;
      const count = usedNames.get(filename) || 0;
      if (count > 0) {
        const ext = filename.split('.').pop() || '';
        const base = filename.slice(0, filename.length - ext.length - 1);
        filename = `${base}_${count}.${ext}`;
      }
      usedNames.set(asset.stored_filename || asset.original_filename, count + 1);

      const arrayBuffer = await fileData.arrayBuffer();
      zip.file(filename, arrayBuffer);
    } catch (err) {
      console.error(`Failed to fetch file ${asset.drive_file_id}:`, err);
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 5 },
  });

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="assethub_download_${Date.now()}.zip"`);
  headers.set('Content-Length', zipBuffer.byteLength.toString());

  return new NextResponse(zipBuffer, { headers });
}
