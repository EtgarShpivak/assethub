import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { computeAspectRatio, computeDimensionsLabel, computeFileSizeLabel } from '@/lib/aspect-ratio';
import sharp from 'sharp';
import JSZip from 'jszip';

// Generate a UUID without Node.js crypto module (Vercel compatible)
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
]);

const EXTRACTABLE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp4', 'mov', 'webm',
  'pdf',
]);

function getFileType(mime: string, filename?: string): 'image' | 'video' | 'pdf' | 'newsletter' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  // Check for common newsletter/brochure formats
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['indd', 'ai', 'eps', 'pub'].includes(ext)) return 'newsletter';
  return 'other';
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    pdf: 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

interface FileToProcess {
  name: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
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
      errors.push({ file: file.name, error: 'קובץ גדול מ-2GB' });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check if it's a ZIP — extract its contents
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const entries = Object.entries(zip.files);

        for (const [path, zipEntry] of entries) {
          if (zipEntry.dir) continue;
          // Skip hidden/system files
          const name = path.split('/').pop() || '';
          if (name.startsWith('.') || name.startsWith('__')) continue;

          const ext = name.split('.').pop()?.toLowerCase() || '';
          if (!EXTRACTABLE_EXTENSIONS.has(ext)) continue;

          try {
            const entryBuffer = Buffer.from(await zipEntry.async('arraybuffer'));
            const mime = guessMimeType(name);
            filesToProcess.push({
              name,
              buffer: entryBuffer,
              mimeType: mime,
              size: entryBuffer.length,
            });
          } catch {
            errors.push({ file: `${file.name}/${name}`, error: 'שגיאה בחילוץ מה-ZIP' });
          }
        }
      } catch {
        errors.push({ file: file.name, error: 'שגיאה בפתיחת קובץ ZIP' });
      }
    } else if (ALLOWED_MIMES.has(file.type)) {
      filesToProcess.push({
        name: file.name,
        buffer,
        mimeType: file.type,
        size: file.size,
      });
    } else {
      errors.push({ file: file.name, error: `סוג קובץ לא נתמך: ${file.type}` });
    }
  }

  // Process all files
  const results = [];
  const uploadDate = customUploadDate ? new Date(customUploadDate).toISOString() : new Date().toISOString();

  for (const file of filesToProcess) {
    try {
      const fileType = getFileType(file.mimeType, file.name);

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
      const ext = file.name.split('.').pop() || 'bin';
      const storedFilename = `${generateUUID()}.${ext}`;
      const fullPath = `${storagePath}/${storedFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fullPath, file.buffer, {
          contentType: file.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        errors.push({ file: file.name, error: `שגיאה בהעלאה: ${uploadError.message}` });
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
        })
        .select()
        .single();

      if (dbError) {
        errors.push({ file: file.name, error: dbError.message });
      } else {
        results.push(asset);
      }
    } catch (err) {
      console.error('Upload error:', err);
      errors.push({ file: file.name, error: String(err) });
    }
  }

  return NextResponse.json({ uploaded: results, errors });
}
