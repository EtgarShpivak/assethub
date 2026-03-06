import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { computeAspectRatio, computeDimensionsLabel, computeFileSizeLabel } from '@/lib/aspect-ratio';
import { logServerError } from '@/lib/error-logger-server';
import { logActivity } from '@/lib/activity-logger';
import sharp from 'sharp';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface FileCompleteInput {
  originalName: string;
  storagePath: string;
  size: number;
  type: string;
  fileType: string;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    files, slug_id, workspace_id, initiative_id,
    domain_context, platforms, tags, upload_date, asset_type, expires_at,
    parent_asset_id, version,
  } = body as {
    files: FileCompleteInput[];
    slug_id: string;
    workspace_id: string;
    initiative_id?: string;
    domain_context?: string;
    platforms?: string[];
    tags?: string[];
    upload_date?: string;
    asset_type?: string;
    expires_at?: string;
    parent_asset_id?: string;
    version?: number;
  };

  if (!slug_id || !workspace_id || !files?.length) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 });
  }

  const uploadDateISO = upload_date ? new Date(upload_date).toISOString() : new Date().toISOString();
  const results: unknown[] = [];
  const errors: { file: string; error: string }[] = [];

  for (const file of files) {
    try {
      // Download file from storage to extract metadata
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('assets')
        .download(file.storagePath);

      if (downloadError || !fileData) {
        errors.push({ file: file.originalName, error: 'לא ניתן לקרוא את הקובץ מהאחסון. ייתכן שההעלאה נכשלה — נסה להעלות שוב.' });
        continue;
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Extract dimensions for images
      let width: number | null = null;
      let height: number | null = null;
      let aspectRatio: string | null = null;
      let dimensionsLabel: string | null = null;

      if (file.fileType === 'image') {
        try {
          const metadata = await sharp(buffer).metadata();
          if (metadata.width && metadata.height) {
            width = metadata.width;
            height = metadata.height;
            aspectRatio = computeAspectRatio(width, height);
            dimensionsLabel = computeDimensionsLabel(width, height);
          }
        } catch {
          // Skip dimension extraction on error
        }
      }

      const fileSizeLabel = computeFileSizeLabel(file.size);

      // Compute hash for reference (stored in DB, no duplicate blocking)
      const fileHash = createHash('sha256').update(buffer).digest('hex');

      // If image with dimensions, rename file with actual dimensions
      let finalPath = file.storagePath;
      if (width && height && file.storagePath.includes('-nodim-')) {
        const ratioPart = aspectRatio ? aspectRatio.replace(':', 'x') : null;
        const sizePart = `${width}x${height}`;
        const ratioSizePart = ratioPart ? `${ratioPart}_${sizePart}` : sizePart;
        const newPath = file.storagePath.replace('-nodim-', `-${ratioSizePart}-`);

        const { error: moveError } = await supabase.storage
          .from('assets')
          .move(file.storagePath, newPath);

        if (!moveError) {
          finalPath = newPath;
        }
      }

      const storedFilename = finalPath.split('/').pop() || '';
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(finalPath);

      // Save to DB
      const { data: asset, error: dbError } = await supabase
        .from('assets')
        .insert({
          workspace_id,
          slug_id,
          initiative_id: initiative_id || null,
          original_filename: file.originalName,
          stored_filename: storedFilename,
          file_type: file.fileType,
          mime_type: file.type,
          file_size_bytes: file.size,
          file_size_label: fileSizeLabel,
          width_px: width,
          height_px: height,
          dimensions_label: dimensionsLabel,
          aspect_ratio: aspectRatio,
          domain_context: domain_context || null,
          asset_type: asset_type || 'production',
          platforms: platforms || null,
          drive_file_id: finalPath,
          drive_view_url: urlData.publicUrl,
          upload_date: uploadDateISO,
          uploaded_by: user.id,
          tags: tags || null,
          file_hash: fileHash,
          expires_at: expires_at || null,
          parent_asset_id: parent_asset_id || null,
          version: version || 1,
        })
        .select()
        .single();

      if (dbError) {
        errors.push({ file: file.originalName, error: 'הקובץ הועלה לאחסון אך לא נשמר במערכת. נסה להעלות שוב.' });
        await logServerError({
          context: 'upload-complete-db',
          errorMessage: `DB insert failed for ${file.originalName}: ${dbError.message}`,
          userId: user.id,
          entityType: 'asset',
          entityName: file.originalName,
        });
      } else {
        results.push(asset);
        // Log successful upload (must await on serverless — unawaited promises get killed)
        await logActivity(request, {
          action: 'upload',
          entityType: 'asset',
          entityId: asset.id,
          entityName: file.originalName,
          userId: user.id,
          workspaceId: workspace_id,
          metadata: {
            file_type: file.fileType,
            file_size_bytes: file.size,
            mime_type: file.type,
            slug_id,
            initiative_id: initiative_id || null,
            expires_at: expires_at || null,
            upload_method: 'direct',
          },
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ file: file.originalName, error: 'שגיאה בלתי צפויה בעיבוד הקובץ. נסה להעלות שוב.' });
      await logServerError({
        context: 'upload-complete-general',
        errorMessage: `Complete failed for ${file.originalName}: ${errMsg}`,
        userId: user.id,
        entityType: 'asset',
        entityName: file.originalName,
      });
    }
  }

  return NextResponse.json({ uploaded: results, errors });
}
