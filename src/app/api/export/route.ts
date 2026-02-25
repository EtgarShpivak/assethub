import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateExportFilename } from '@/lib/export-naming';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { asset_ids, platform, workspace_id } = body;

  if (!asset_ids || !platform || !workspace_id) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים: asset_ids, platform, workspace_id' },
      { status: 400 }
    );
  }

  // Get workspace info
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug_prefix')
    .eq('id', workspace_id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: 'סביבת עבודה לא נמצאה' }, { status: 404 });
  }

  // Get all selected assets with relations
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*, initiatives(short_code)')
    .in('id', asset_ids);

  if (error || !assets) {
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים' }, { status: 500 });
  }

  // Group assets by dimensions for sequence numbering
  const dimCounters: Record<string, number> = {};

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 5 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  for (const asset of assets) {
    if (!asset.drive_file_id) continue;

    const dims = asset.dimensions_label || 'unknown';
    const key = `${asset.initiative_id || 'standalone'}_${platform}_${dims}`;
    dimCounters[key] = (dimCounters[key] || 0) + 1;

    const ext = asset.original_filename.split('.').pop() || 'bin';
    const initiativeCode = (asset.initiatives as { short_code: string } | null)?.short_code || null;

    const filename = generateExportFilename({
      workspaceSlug: workspace.slug_prefix,
      initiativeCode,
      platform,
      dimensions: dims,
      sequence: dimCounters[key],
      ext,
    });

    try {
      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('assets')
        .download(asset.drive_file_id);

      if (downloadError || !fileData) {
        console.error(`Failed to download file ${asset.drive_file_id}:`, downloadError);
        continue;
      }

      // Convert Blob to Node.js Readable stream for archiver
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const readable = Readable.from(buffer);

      archive.append(readable, { name: filename });
    } catch (err) {
      console.error(`Failed to fetch file ${asset.drive_file_id}:`, err);
    }
  }

  await archive.finalize();

  // Log the export
  await supabase.from('export_logs').insert({
    workspace_id,
    platform,
    asset_count: assets.length,
    exported_by: body.exported_by || null,
  }).select().maybeSingle();

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${workspace.slug_prefix}_${platform}_export.zip"`
  );

  // @ts-expect-error PassThrough is a readable stream
  return new NextResponse(passthrough, { headers });
}
