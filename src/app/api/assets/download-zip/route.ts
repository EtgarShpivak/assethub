import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { asset_ids } = body;

  if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
    return NextResponse.json(
      { error: 'נדרשת רשימת מזהי חומרים' },
      { status: 400 }
    );
  }

  // Get all selected assets
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, drive_file_id, original_filename, mime_type')
    .in('id', asset_ids);

  if (error || !assets) {
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים' }, { status: 500 });
  }

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 5 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

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

      // Handle duplicate filenames
      let filename = asset.original_filename;
      const count = usedNames.get(filename) || 0;
      if (count > 0) {
        const ext = filename.split('.').pop() || '';
        const base = filename.slice(0, filename.length - ext.length - 1);
        filename = `${base}_${count}.${ext}`;
      }
      usedNames.set(asset.original_filename, count + 1);

      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const readable = Readable.from(buffer);

      archive.append(readable, { name: filename });
    } catch (err) {
      console.error(`Failed to fetch file ${asset.drive_file_id}:`, err);
    }
  }

  await archive.finalize();

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="assethub_download_${Date.now()}.zip"`);

  // @ts-expect-error PassThrough is a readable stream
  return new NextResponse(passthrough, { headers });
}
