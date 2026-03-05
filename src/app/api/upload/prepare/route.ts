import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logServerError } from '@/lib/error-logger-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
  'video/mpeg', 'video/3gpp', 'video/x-matroska', 'video/ogg',
  'application/pdf',
  'application/x-indesign', 'application/postscript', 'application/illustrator',
  'application/vnd.ms-publisher', 'text/html',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/msword',
]);

const NEWSLETTER_EXTENSIONS = new Set([
  'indd', 'ai', 'eps', 'pub', 'html', 'htm', 'pptx', 'ppt', 'docx', 'doc', 'idml',
]);

function isAllowedFile(name: string, type: string): boolean {
  if (ALLOWED_MIMES.has(type)) return true;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return NEWSLETTER_EXTENSIONS.has(ext);
}

function getFileType(mime: string, filename?: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (NEWSLETTER_EXTENSIONS.has(ext)) return 'newsletter';
  if (mime === 'text/html') return 'newsletter';
  if (mime.includes('indesign') || mime.includes('publisher') || mime.includes('illustrator')) return 'newsletter';
  return 'other';
}

interface FileInput {
  name: string;
  size: number;
  type: string;
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

  const { files, slug_id, workspace_id, initiative_id, upload_date } = body as {
    files: FileInput[];
    slug_id: string;
    workspace_id: string;
    initiative_id?: string;
    upload_date?: string;
  };

  if (!slug_id || !workspace_id || !files?.length) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 });
  }

  // Get workspace and slug info for storage path
  const [{ data: workspace }, { data: slug }, initiative] = await Promise.all([
    supabase.from('workspaces').select('slug_prefix').eq('id', workspace_id).single(),
    supabase.from('slugs').select('slug').eq('id', slug_id).single(),
    initiative_id
      ? supabase.from('initiatives').select('short_code').eq('id', initiative_id).single().then(r => r.data)
      : Promise.resolve(null),
  ]);

  if (!workspace || !slug) {
    return NextResponse.json({ error: 'סביבת עבודה או סלאג לא נמצאו' }, { status: 404 });
  }

  const storagePath = [
    workspace.slug_prefix,
    slug.slug,
    initiative ? initiative.short_code : 'standalone',
  ].join('/');

  const uploadDateISO = upload_date ? new Date(upload_date).toISOString() : new Date().toISOString();
  const dateStr = uploadDateISO.split('T')[0].replace(/-/g, '');

  const prepared: {
    originalName: string;
    storagePath: string;
    signedUrl: string;
    token: string;
    fileType: string;
  }[] = [];
  const errors: { file: string; error: string }[] = [];

  // Track how many files of each (prefix, ext) we've already seen in THIS batch
  // to avoid duplicate filenames when uploading multiple files of the same type
  const batchCounts: Record<string, number> = {};

  for (const file of files) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push({ file: file.name, error: `הקובץ גדול מדי (${sizeMB} MB). הגודל המקסימלי הוא 50MB` });
      continue;
    }

    // Validate type
    if (!isAllowedFile(file.name, file.type)) {
      const fileExt = file.name.split('.').pop()?.toUpperCase() || '';
      errors.push({ file: file.name, error: `סוג קובץ לא נתמך (${fileExt}). סוגים נתמכים: תמונות, סרטונים, PDF, PSD, AI.` });
      continue;
    }

    const detectedType = getFileType(file.type, file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';

    // Build smart filename (dimensions resolved in complete phase for images)
    const namePrefix = [
      slug.slug,
      initiative?.short_code || 'standalone',
      dateStr,
      detectedType,
    ].join('-');

    // Count existing files for running number
    // Use the prefix WITHOUT 'nodim' so we find already-completed files too
    // (completed images get 'nodim' replaced with actual dimensions)
    const { count: existingCount } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('slug_id', slug_id)
      .eq('file_type', detectedType)
      .like('stored_filename', `${namePrefix}-%`);

    // Add batch offset so multiple files of same type get unique numbers
    const batchKey = `${namePrefix}-${ext}`;
    batchCounts[batchKey] = (batchCounts[batchKey] || 0);
    const batchOffset = batchCounts[batchKey];
    batchCounts[batchKey]++;

    const runNumber = String((existingCount || 0) + 1 + batchOffset).padStart(2, '0');
    const storedFilename = `${namePrefix}-nodim-${runNumber}.${ext}`;
    const fullPath = `${storagePath}/${storedFilename}`;

    // Create signed upload URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('assets')
      .createSignedUploadUrl(fullPath);

    if (signError || !signedData) {
      errors.push({ file: file.name, error: 'לא ניתן ליצור קישור העלאה. ייתכן שהאחסון מלא — נסה שוב בעוד דקה.' });
      await logServerError({
        context: 'upload-prepare',
        errorMessage: `Signed URL creation failed for ${file.name}: ${signError?.message}`,
        userId: user.id,
        entityType: 'asset',
        entityName: file.name,
      });
      continue;
    }

    prepared.push({
      originalName: file.name,
      storagePath: fullPath,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      fileType: detectedType,
    });
  }

  return NextResponse.json({ files: prepared, errors });
}
