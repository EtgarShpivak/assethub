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
  const { asset_ids, share_token, naming, initiative_id } = body as {
    asset_ids?: string[];
    share_token?: string;
    naming?: 'original' | 'smart' | 'campaign' | 'sequential';
    initiative_id?: string;
  };

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

  // Fetch initiative details if needed for naming
  let initiativeShortCode: string | null = null;
  let initiativeName: string | null = null;

  if (initiative_id && (naming === 'campaign' || naming === 'sequential')) {
    const { data: initiative } = await supabase
      .from('initiatives')
      .select('short_code, name')
      .eq('id', initiative_id)
      .single();

    if (initiative) {
      initiativeShortCode = initiative.short_code;
      initiativeName = initiative.name;
    }
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
  let sequentialIndex = 1;

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

      // Determine filename based on naming preset
      let filename: string;
      const namingMode = naming || 'original';

      switch (namingMode) {
        case 'smart':
          filename = asset.stored_filename || asset.original_filename;
          break;
        case 'campaign':
          if (initiativeShortCode) {
            filename = `${initiativeShortCode}_${asset.stored_filename || asset.original_filename}`;
          } else {
            filename = asset.stored_filename || asset.original_filename;
          }
          break;
        case 'sequential': {
          const ext = (asset.stored_filename || asset.original_filename).split('.').pop() || '';
          const prefix = initiativeName || 'asset';
          filename = `${prefix}_${String(sequentialIndex).padStart(2, '0')}.${ext}`;
          sequentialIndex++;
          break;
        }
        case 'original':
        default:
          filename = asset.original_filename || asset.stored_filename;
          break;
      }

      // Deduplicate filenames
      const count = usedNames.get(filename) || 0;
      if (count > 0) {
        const ext = filename.split('.').pop() || '';
        const base = filename.slice(0, filename.length - ext.length - 1);
        filename = `${base}_${count}.${ext}`;
      }
      usedNames.set(filename, count + 1);

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

  // Build ZIP filename — include initiative short_code when available
  const zipPrefix = initiativeShortCode ? `${initiativeShortCode}_assets` : 'assethub_download';
  const zipFilename = `${zipPrefix}_${Date.now()}.zip`;

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`);
  headers.set('Content-Length', zipBuffer.byteLength.toString());

  return new NextResponse(zipBuffer, { headers });
}
