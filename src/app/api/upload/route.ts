import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { computeAspectRatio, computeDimensionsLabel, computeFileSizeLabel } from '@/lib/aspect-ratio';
import { logServerError } from '@/lib/error-logger-server';
import { logActivity } from '@/lib/activity-logger';
import sharp from 'sharp';
import JSZip from 'jszip';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for large uploads
export const fetchCache = 'force-no-store';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase storage limit)
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
  'video/mpeg', 'video/3gpp', 'video/x-matroska', 'video/ogg',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  // Newsletter/brochure formats
  'application/x-indesign',
  'application/postscript',
  'application/illustrator',
  'application/vnd.ms-publisher',
  'text/html',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/msword',
]);

// Extensions recognized as newsletter/brochure
const NEWSLETTER_EXTENSIONS = new Set([
  'indd', 'ai', 'eps', 'pub', 'html', 'htm',
  'pptx', 'ppt', 'docx', 'doc', 'idml',
]);

const EXTRACTABLE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif',
  'mp4', 'mov', 'webm', 'avi', 'mpeg', 'mpg', 'mkv', '3gp', 'ogg',
  'pdf',
  // Newsletter formats in ZIP
  'indd', 'ai', 'eps', 'pub', 'html', 'htm',
  'pptx', 'ppt', 'docx', 'doc', 'idml',
]);

function getFileType(mime: string, filename?: string): 'image' | 'video' | 'pdf' | 'newsletter' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  // Check for newsletter/brochure formats by extension first
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (NEWSLETTER_EXTENSIONS.has(ext)) return 'newsletter';
  if (mime === 'text/html') return 'newsletter';
  if (mime.includes('indesign') || mime.includes('publisher') || mime.includes('illustrator')) return 'newsletter';
  return 'other';
}

// Check if a file with generic mime type should be allowed based on extension
function isAllowedByExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return NEWSLETTER_EXTENSIONS.has(ext);
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff',
    heic: 'image/heic', heif: 'image/heif', avif: 'image/avif',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    avi: 'video/x-msvideo', mpeg: 'video/mpeg', mpg: 'video/mpeg',
    mkv: 'video/x-matroska', '3gp': 'video/3gpp', ogg: 'video/ogg',
    pdf: 'application/pdf',
    indd: 'application/x-indesign', ai: 'application/postscript',
    eps: 'application/postscript', pub: 'application/vnd.ms-publisher',
    html: 'text/html', htm: 'text/html',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword', idml: 'application/octet-stream',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

interface FileToProcess {
  name: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

const MAX_ZIP_DEPTH = 3;

async function extractZipContents(
  buffer: Buffer,
  zipName: string,
  depth: number = 0
): Promise<{ files: FileToProcess[]; errors: { file: string; error: string }[] }> {
  const files: FileToProcess[] = [];
  const errors: { file: string; error: string }[] = [];

  if (depth > MAX_ZIP_DEPTH) {
    errors.push({ file: zipName, error: 'קובץ ZIP מקונן עמוק מדי (מקסימום 3 רמות)' });
    return { files, errors };
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.entries(zip.files);

    for (const [path, zipEntry] of entries) {
      if (zipEntry.dir) continue;
      const name = path.split('/').pop() || '';
      if (name.startsWith('.') || name.startsWith('__')) continue;

      const ext = name.split('.').pop()?.toLowerCase() || '';

      try {
        const entryBuffer = Buffer.from(await zipEntry.async('arraybuffer'));

        // Recursively extract nested ZIPs
        if (ext === 'zip') {
          const nested = await extractZipContents(entryBuffer, `${zipName}/${name}`, depth + 1);
          files.push(...nested.files);
          errors.push(...nested.errors);
          continue;
        }

        if (!EXTRACTABLE_EXTENSIONS.has(ext)) continue;

        const mime = guessMimeType(name);
        files.push({ name, buffer: entryBuffer, mimeType: mime, size: entryBuffer.length });
      } catch {
        errors.push({ file: `${zipName}/${name}`, error: 'שגיאה בחילוץ מה-ZIP' });
      }
    }
  } catch {
    errors.push({ file: zipName, error: 'שגיאה בפתיחת קובץ ZIP' });
  }

  return { files, errors };
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const slugId = formData.get('slug_id') as string;
  const workspaceId = formData.get('workspace_id') as string;
  const initiativeId = formData.get('initiative_id') as string | null;
  const domainContext = formData.get('domain_context') as string | null;
  const platforms = formData.get('platforms') as string | null;
  const tags = formData.get('tags') as string | null;
  const uploadedBy = formData.get('uploaded_by') as string | null;
  const assetType = (formData.get('asset_type') as string) || 'production';
  const customUploadDate = formData.get('upload_date') as string | null;
  const fileTypeOverride = formData.get('file_type_override') as string | null;
  const expiresAt = formData.get('expires_at') as string | null;

  if (!slugId || !workspaceId) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים: slug_id, workspace_id' },
      { status: 400 }
    );
  }

  // Get workspace and slug info for storage path
  const [{ data: workspace }, { data: slug }, initiative] = await Promise.all([
    supabase.from('workspaces').select('slug_prefix').eq('id', workspaceId).single(),
    supabase.from('slugs').select('slug').eq('id', slugId).single(),
    initiativeId
      ? supabase.from('initiatives').select('short_code').eq('id', initiativeId).single().then(r => r.data)
      : Promise.resolve(null),
  ]);

  if (!workspace || !slug) {
    return NextResponse.json({ error: 'סביבת עבודה או סלאג לא נמצאו' }, { status: 404 });
  }

  // Build storage path
  const storagePath = [
    workspace.slug_prefix,
    slug.slug,
    initiative ? initiative.short_code : 'standalone',
  ].join('/');

  // Collect all files to process (including extracted ZIP contents)
  const filesToProcess: FileToProcess[] = [];
  const errors: { file: string; error: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push({ file: file.name, error: `הקובץ גדול מדי (${sizeMB} MB). הגודל המקסימלי הוא 50MB.` });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check if it's a ZIP — extract its contents (including nested ZIPs)
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip')) {
      const result = await extractZipContents(buffer, file.name);
      filesToProcess.push(...result.files);
      errors.push(...result.errors);
    } else if (ALLOWED_MIMES.has(file.type) || isAllowedByExtension(file.name)) {
      // Use proper mime type based on extension if browser sent generic type
      const mimeType = (file.type === 'application/octet-stream' || !file.type)
        ? guessMimeType(file.name)
        : file.type;
      filesToProcess.push({
        name: file.name,
        buffer,
        mimeType,
        size: file.size,
      });
    } else {
      const fileExt = file.name.split('.').pop()?.toUpperCase() || '';
      errors.push({ file: file.name, error: `סוג קובץ לא נתמך (${fileExt}). סוגים נתמכים: תמונות, סרטונים, PDF, PSD, AI.` });
    }
  }

  // Process all files
  const results = [];
  const uploadDate = customUploadDate ? new Date(customUploadDate).toISOString() : new Date().toISOString();

  for (const file of filesToProcess) {
    try {
      // Use manual override if provided, otherwise auto-detect
      const fileType = (fileTypeOverride && ['image', 'video', 'pdf', 'newsletter', 'other'].includes(fileTypeOverride))
        ? fileTypeOverride as 'image' | 'video' | 'pdf' | 'newsletter' | 'other'
        : getFileType(file.mimeType, file.name);

      // Extract dimensions for images
      let width: number | null = null;
      let height: number | null = null;
      let aspectRatio: string | null = null;
      let dimensionsLabel: string | null = null;

      if (fileType === 'image') {
        try {
          const metadata = await sharp(file.buffer).metadata();
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

      // Compute SHA-256 hash for duplicate detection
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';

      // Smart file naming: slug-campaign-date-type-ratiosize-[n].ext
      const dateStr = uploadDate.split('T')[0].replace(/-/g, '');
      // Build ratiosize part: e.g. "1x1_1080x1080", "16x9_1920x1080", or "nodim"
      let ratioSizePart = 'nodim';
      if (width && height) {
        const ratioPart = aspectRatio ? aspectRatio.replace(':', 'x') : null;
        const sizePart = `${width}x${height}`;
        ratioSizePart = ratioPart ? `${ratioPart}_${sizePart}` : sizePart;
      }
      const baseName = [
        slug.slug,
        initiative?.short_code || 'standalone',
        dateStr,
        fileType,
        ratioSizePart,
      ].join('-');

      // Count existing files with same base to generate running number
      const { count: existingCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('slug_id', slugId)
        .eq('file_type', fileType)
        .like('stored_filename', `${baseName}%`);

      const runNumber = String((existingCount || 0) + 1).padStart(2, '0');
      const storedFilename = `${baseName}-${runNumber}.${ext}`;
      const fullPath = `${storagePath}/${storedFilename}`;

      // Check for duplicate file
      const { data: existingDuplicate } = await supabase
        .from('assets')
        .select('id, original_filename, stored_filename')
        .eq('file_hash', fileHash)
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (existingDuplicate) {
        errors.push({ file: file.name, error: `קובץ כפול: כבר קיים כ-"${existingDuplicate.original_filename}"` });
        continue;
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fullPath, file.buffer, {
          contentType: file.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        errors.push({ file: file.name, error: 'שגיאה בהעלאה לאחסון. ייתכן שהאחסון מלא — נסה שוב בעוד דקה.' });
        await logServerError({
          context: 'upload-storage',
          errorMessage: `Storage upload failed for ${file.name}: ${uploadError.message}`,
          userId: user.id,
          entityType: 'asset',
          entityName: file.name,
          extra: { path: fullPath, mimeType: file.mimeType, size: file.size },
        });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fullPath);

      // Save to DB
      const { data: asset, error: dbError } = await supabase
        .from('assets')
        .insert({
          workspace_id: workspaceId,
          slug_id: slugId,
          initiative_id: initiativeId || null,
          original_filename: file.name,
          stored_filename: storedFilename,
          file_type: fileType,
          mime_type: file.mimeType,
          file_size_bytes: file.size,
          file_size_label: fileSizeLabel,
          width_px: width,
          height_px: height,
          dimensions_label: dimensionsLabel,
          aspect_ratio: aspectRatio,
          domain_context: domainContext || null,
          asset_type: assetType,
          platforms: platforms ? JSON.parse(platforms) : null,
          drive_file_id: fullPath,
          drive_view_url: urlData.publicUrl,
          upload_date: uploadDate,
          uploaded_by: uploadedBy || null,
          tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
          file_hash: fileHash,
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (dbError) {
        errors.push({ file: file.name, error: 'הקובץ הועלה לאחסון אך לא נשמר במערכת. נסה להעלות שוב.' });
        await logServerError({
          context: 'upload-database',
          errorMessage: `DB insert failed for ${file.name}: ${dbError.message}`,
          userId: user.id,
          entityType: 'asset',
          entityName: file.name,
          extra: { storedFilename, fullPath },
        });
      } else {
        results.push(asset);
        // Log successful upload
        logActivity(request, {
          action: 'upload',
          entityType: 'asset',
          entityId: asset.id,
          entityName: file.name,
          userId: user.id,
          workspaceId: workspaceId,
          metadata: {
            file_type: fileType,
            file_size_bytes: file.size,
            mime_type: file.mimeType,
            slug_id: slugId,
            initiative_id: initiativeId || null,
            expires_at: expiresAt || null,
            upload_method: 'zip',
          },
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ file: file.name, error: 'שגיאה בלתי צפויה בעיבוד הקובץ. נסה להעלות שוב.' });
      await logServerError({
        context: 'upload-general',
        errorMessage: `Upload failed for ${file.name}: ${errMsg}`,
        userId: user.id,
        entityType: 'asset',
        entityName: file.name,
      });
    }
  }

  return NextResponse.json({ uploaded: results, errors });
}
