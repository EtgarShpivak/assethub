# Direct Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix video uploads by bypassing Vercel's 4.5MB body limit with direct-to-Supabase signed URL uploads, add nested ZIP extraction, and show clear per-file size errors.

**Architecture:** Non-ZIP files use a 3-phase flow: prepare (get signed URLs) → direct upload to Supabase → complete (create DB records). ZIP files continue through the existing server route with added recursive extraction. Client validates file sizes before upload and shows per-file status.

**Tech Stack:** Next.js 14 App Router, Supabase Storage (signed URLs), JSZip, Sharp, TypeScript

---

### Task 1: Add Nested ZIP Extraction to Existing Upload Route

**Files:**
- Modify: `src/app/api/upload/route.ts:155-186` (ZIP extraction block)

**Step 1: Add recursive ZIP extraction function**

Above the POST handler (around line 88), add a helper function:

```typescript
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
```

**Step 2: Replace inline ZIP extraction with the new function**

Replace lines 155-186 (the ZIP handling block inside the `for (const file of files)` loop):

```typescript
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip')) {
      const result = await extractZipContents(buffer, file.name);
      filesToProcess.push(...result.files);
      errors.push(...result.errors);
    }
```

**Step 3: Update MAX_FILE_SIZE to 50MB**

Change line 13:
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase storage limit)
```

**Step 4: Build and verify**

Run: `export PATH="/c/Program Files/nodejs:/c/Windows/System32:$PATH" && cd /c/code/assethub && node node_modules/next/dist/bin/next build 2>&1 | tail -30`
Expected: Build succeeds with no new errors.

**Step 5: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add recursive nested ZIP extraction (max 3 levels)"
```

---

### Task 2: Create /api/upload/prepare Route

**Files:**
- Create: `src/app/api/upload/prepare/route.ts`

**Step 1: Create the prepare route**

This route receives file metadata (no file bodies), validates files, generates storage paths and signed upload URLs.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logServerError } from '@/lib/error-logger-server';

export const dynamic = 'force-dynamic';

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
  const body = await request.json();
  const { files, slug_id, workspace_id, initiative_id, upload_date, asset_type } = body as {
    files: FileInput[];
    slug_id: string;
    workspace_id: string;
    initiative_id?: string;
    upload_date?: string;
    asset_type?: string;
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

  const uploadDate = upload_date ? new Date(upload_date).toISOString() : new Date().toISOString();
  const dateStr = uploadDate.split('T')[0].replace(/-/g, '');
  const fileType = asset_type || 'production';

  const prepared: {
    originalName: string;
    storagePath: string;
    signedUrl: string;
    token: string;
    fileType: string;
  }[] = [];
  const errors: { file: string; error: string }[] = [];

  for (const file of files) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push({ file: file.name, error: `הקובץ גדול מדי (${sizeMB} MB). הגודל המקסימלי הוא 50MB` });
      continue;
    }

    // Validate type
    if (!isAllowedFile(file.name, file.type)) {
      errors.push({ file: file.name, error: `סוג קובץ לא נתמך: ${file.type || file.name.split('.').pop()}` });
      continue;
    }

    const detectedType = getFileType(file.type, file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';

    // Build smart filename (without dimensions — those come in complete phase)
    const baseName = [
      slug.slug,
      initiative?.short_code || 'standalone',
      dateStr,
      detectedType,
      'nodim', // dimensions resolved in complete phase for images
    ].join('-');

    // Count existing files for running number
    const { count: existingCount } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('slug_id', slug_id)
      .eq('file_type', detectedType)
      .like('stored_filename', `${baseName}%`);

    const runNumber = String((existingCount || 0) + 1).padStart(2, '0');
    const storedFilename = `${baseName}-${runNumber}.${ext}`;
    const fullPath = `${storagePath}/${storedFilename}`;

    // Create signed upload URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('assets')
      .createSignedUploadUrl(fullPath);

    if (signError || !signedData) {
      errors.push({ file: file.name, error: 'שגיאה ביצירת קישור העלאה' });
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
```

**Step 2: Build and verify**

Run: build command
Expected: Build succeeds, new route appears as `ƒ /api/upload/prepare`

**Step 3: Commit**

```bash
git add src/app/api/upload/prepare/route.ts
git commit -m "feat: add /api/upload/prepare route for signed URL generation"
```

---

### Task 3: Create /api/upload/complete Route

**Files:**
- Create: `src/app/api/upload/complete/route.ts`

**Step 1: Create the complete route**

This route receives metadata for already-uploaded files, fetches them from storage to extract dimensions and compute hash, then creates DB records.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { computeAspectRatio, computeDimensionsLabel, computeFileSizeLabel } from '@/lib/aspect-ratio';
import { logServerError } from '@/lib/error-logger-server';
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
  const body = await request.json();
  const {
    files, slug_id, workspace_id, initiative_id,
    domain_context, platforms, tags, upload_date, asset_type,
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
        errors.push({ file: file.originalName, error: `שגיאה בקריאת הקובץ מהאחסון: ${downloadError?.message}` });
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

      // Compute hash for duplicate detection
      const fileHash = createHash('sha256').update(buffer).digest('hex');

      // Check for duplicates
      const { data: existingDuplicate } = await supabase
        .from('assets')
        .select('id, original_filename')
        .eq('file_hash', fileHash)
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (existingDuplicate) {
        // Remove from storage since it's a duplicate
        await supabase.storage.from('assets').remove([file.storagePath]);
        errors.push({ file: file.originalName, error: `קובץ כפול: כבר קיים כ-"${existingDuplicate.original_filename}"` });
        continue;
      }

      // If image, rename with actual dimensions
      let finalPath = file.storagePath;
      if (width && height && file.storagePath.includes('-nodim-')) {
        const ratioPart = aspectRatio ? aspectRatio.replace(':', 'x') : null;
        const sizePart = `${width}x${height}`;
        const ratioSizePart = ratioPart ? `${ratioPart}_${sizePart}` : sizePart;
        const newPath = file.storagePath.replace('-nodim-', `-${ratioSizePart}-`);

        // Move file to new path
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
          uploaded_by: null,
          tags: tags || null,
          file_hash: fileHash,
        })
        .select()
        .single();

      if (dbError) {
        errors.push({ file: file.originalName, error: `שגיאה בשמירת פרטי הקובץ: ${dbError.message}` });
        await logServerError({
          context: 'upload-complete-db',
          errorMessage: `DB insert failed for ${file.originalName}: ${dbError.message}`,
          userId: user.id,
          entityType: 'asset',
          entityName: file.originalName,
        });
      } else {
        results.push(asset);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ file: file.originalName, error: `שגיאה כללית: ${errMsg}` });
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
```

**Step 2: Build and verify**

Run: build command
Expected: Build succeeds, new route `ƒ /api/upload/complete` visible.

**Step 3: Commit**

```bash
git add src/app/api/upload/complete/route.ts
git commit -m "feat: add /api/upload/complete route for DB record creation"
```

---

### Task 4: Update Upload Page — Client-Side Direct Upload

**Files:**
- Modify: `src/app/(authenticated)/upload/page.tsx`

**Step 1: Add file size validation and size limit constant**

Near the top of the component (after state declarations, around line 92), add:

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

**Step 2: Add size validation to addFiles function**

Replace the `addFiles` function (lines 127-132):

```typescript
  const addFiles = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map(f => {
      const tooLarge = f.size > MAX_FILE_SIZE;
      return {
        file: f, name: f.name, size: f.size, type: f.type,
        error: tooLarge ? `הקובץ גדול מדי (${(f.size / (1024 * 1024)).toFixed(1)} MB). הגודל המקסימלי הוא 50MB` : undefined,
      };
    });
    setFiles(prev => [...prev, ...entries]);
  };
```

Add `error?: string` to the FileEntry interface (line 37-42):

```typescript
interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
  error?: string;
}
```

**Step 3: Rewrite handleUpload for split flow (ZIP vs direct)**

Replace the entire `handleUpload` function (lines 138-213) with the new 3-phase flow:

```typescript
  const handleUpload = async () => {
    if (!selectedSlug || !selectedWorkspace || files.length === 0) return;
    setUploading(true);
    setUploadResults(null);

    const progress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
    files.forEach((_, i) => { progress[i] = 'pending'; });

    // Split: oversized files are already marked with error, skip them
    const validFiles = files.filter(f => !f.error);
    const zipFiles = validFiles.filter(f => f.type.includes('zip') || f.name.endsWith('.zip'));
    const directFiles = validFiles.filter(f => !f.type.includes('zip') && !f.name.endsWith('.zip'));

    // Mark oversized as error immediately
    files.forEach((f, i) => { if (f.error) progress[i] = 'error'; });
    setUploadProgress({ ...progress });

    let totalUploaded = 0;
    let totalErrors = files.filter(f => f.error).length;
    const allErrorDetails: { file: string; error: string }[] = files
      .filter(f => f.error)
      .map(f => ({ file: f.name, error: f.error! }));

    // --- Phase A: Upload ZIPs through existing route ---
    if (zipFiles.length > 0) {
      const zipIndices = files.map((f, i) => zipFiles.includes(f) ? i : -1).filter(i => i >= 0);
      zipIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      const formData = new FormData();
      zipFiles.forEach(f => formData.append('files', f.file));
      formData.append('workspace_id', selectedWorkspace);
      formData.append('slug_id', selectedSlug);
      formData.append('asset_type', assetType);
      formData.append('upload_date', uploadDate);
      if (selectedInitiative) formData.append('initiative_id', selectedInitiative);
      if (domainContext) formData.append('domain_context', domainContext);
      if (selectedPlatforms.length > 0) formData.append('platforms', JSON.stringify(selectedPlatforms));
      if (selectedTags.length > 0) formData.append('tags', selectedTags.join(','));

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const result = await res.json();
          totalUploaded += result.uploaded?.length || 0;
          totalErrors += result.errors?.length || 0;
          if (result.errors) allErrorDetails.push(...result.errors);
          zipIndices.forEach(i => {
            progress[i] = result.errors?.find((e: { file: string }) => e.file === files[i].name) ? 'error' : 'done';
          });
        } else {
          zipIndices.forEach(i => { progress[i] = 'error'; });
          totalErrors += zipFiles.length;
        }
      } catch {
        zipIndices.forEach(i => { progress[i] = 'error'; });
        totalErrors += zipFiles.length;
      }
      setUploadProgress({ ...progress });
    }

    // --- Phase B: Direct upload for non-ZIP files ---
    if (directFiles.length > 0) {
      const directIndices = files.map((f, i) => directFiles.includes(f) ? i : -1).filter(i => i >= 0);
      directIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      try {
        // B1: Prepare — get signed URLs
        const prepareRes = await fetch('/api/upload/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: directFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
            slug_id: selectedSlug,
            workspace_id: selectedWorkspace,
            initiative_id: selectedInitiative || undefined,
            upload_date: uploadDate,
            asset_type: assetType,
          }),
        });

        if (!prepareRes.ok) {
          directIndices.forEach(i => { progress[i] = 'error'; });
          totalErrors += directFiles.length;
          setUploadProgress({ ...progress });
        } else {
          const prepareData = await prepareRes.json();

          // Handle files rejected by prepare
          if (prepareData.errors?.length) {
            totalErrors += prepareData.errors.length;
            allErrorDetails.push(...prepareData.errors);
            for (const err of prepareData.errors) {
              const idx = files.findIndex(f => f.name === err.file);
              if (idx >= 0) progress[idx] = 'error';
            }
            setUploadProgress({ ...progress });
          }

          // B2: Upload each file directly to Supabase
          const successfulUploads: typeof prepareData.files = [];
          for (const prepared of prepareData.files || []) {
            const fileEntry = directFiles.find(f => f.name === prepared.originalName);
            const fileIdx = files.findIndex(f => f.name === prepared.originalName);
            if (!fileEntry || fileIdx < 0) continue;

            try {
              const uploadRes = await fetch(prepared.signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': fileEntry.type || 'application/octet-stream' },
                body: fileEntry.file,
              });

              if (uploadRes.ok) {
                progress[fileIdx] = 'done';
                successfulUploads.push(prepared);
              } else {
                progress[fileIdx] = 'error';
                totalErrors++;
                allErrorDetails.push({ file: prepared.originalName, error: `שגיאה בהעלאה ישירה (${uploadRes.status})` });
              }
            } catch {
              progress[fileIdx] = 'error';
              totalErrors++;
              allErrorDetails.push({ file: prepared.originalName, error: 'שגיאת רשת בהעלאה' });
            }
            setUploadProgress({ ...progress });
          }

          // B3: Complete — create DB records for successful uploads
          if (successfulUploads.length > 0) {
            try {
              const completeRes = await fetch('/api/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  files: successfulUploads.map(p => ({
                    originalName: p.originalName,
                    storagePath: p.storagePath,
                    size: directFiles.find(f => f.name === p.originalName)?.size || 0,
                    type: directFiles.find(f => f.name === p.originalName)?.type || '',
                    fileType: p.fileType,
                  })),
                  slug_id: selectedSlug,
                  workspace_id: selectedWorkspace,
                  initiative_id: selectedInitiative || undefined,
                  domain_context: domainContext || undefined,
                  platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
                  tags: selectedTags.length > 0 ? selectedTags : undefined,
                  upload_date: uploadDate,
                  asset_type: assetType,
                }),
              });

              if (completeRes.ok) {
                const completeData = await completeRes.json();
                totalUploaded += completeData.uploaded?.length || 0;
                if (completeData.errors?.length) {
                  totalErrors += completeData.errors.length;
                  allErrorDetails.push(...completeData.errors);
                  for (const err of completeData.errors) {
                    const idx = files.findIndex(f => f.name === err.file);
                    if (idx >= 0) progress[idx] = 'error';
                  }
                }
              } else {
                // Complete failed — mark storage-uploaded files as errors
                for (const p of successfulUploads) {
                  const idx = files.findIndex(f => f.name === p.originalName);
                  if (idx >= 0) progress[idx] = 'error';
                  totalErrors++;
                }
              }
            } catch {
              for (const p of successfulUploads) {
                const idx = files.findIndex(f => f.name === p.originalName);
                if (idx >= 0) progress[idx] = 'error';
                totalErrors++;
              }
            }
            setUploadProgress({ ...progress });
          }
        }
      } catch (err) {
        directIndices.forEach(i => { progress[i] = 'error'; });
        totalErrors += directFiles.length;
        setUploadProgress({ ...progress });
        await logClientError('upload-direct', err instanceof Error ? err.message : 'Network error');
      }
    }

    // Show results
    setUploadResults({ uploaded: totalUploaded, errors: totalErrors });
    if (totalUploaded > 0 && totalErrors === 0) {
      showSuccess(`${totalUploaded} קבצים הועלו בהצלחה`);
    } else if (totalUploaded > 0 && totalErrors > 0) {
      showWarning(
        `${totalUploaded} קבצים הועלו, ${totalErrors} נכשלו`,
        allErrorDetails.map(e => `${e.file}: ${e.error}`).join(' | '),
        'בדוק את הקבצים שנכשלו ונסה להעלות אותם שוב.',
      );
    } else if (totalErrors > 0) {
      showError(
        'כל הקבצים נכשלו בהעלאה',
        allErrorDetails.map(e => `${e.file}: ${e.error}`).join(' | '),
        'בדוק את סוג הקבצים ואת הגודל ונסה שוב.',
      );
    }

    setUploading(false);
  };
```

**Step 4: Update file list to show size errors in red**

In the file list rendering (around line 320), update the file row to show errors:

Replace the file list item div:

```tsx
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${f.error ? 'bg-red-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <FileTypeIcon type={f.type} filename={f.name} />
                  <div>
                    <p className="text-sm text-ono-gray-dark">{f.name}</p>
                    <p className="text-xs text-ono-gray">{computeFileSizeLabel(f.size)}</p>
                    {f.error && <p className="text-xs text-red-600 mt-0.5">{f.error}</p>}
                  </div>
                </div>
```

**Step 5: Update drop zone text with correct size limit**

Change the size text in the drop zone (line 292):

```tsx
        <p className="text-sm text-ono-gray">תמונות, וידאו, PDF, ידיעונים (InDesign, AI, HTML, PPTX, DOCX), ZIP — עד 50MB</p>
```

**Step 6: Build and verify**

Run: build command
Expected: Build succeeds with no errors.

**Step 7: Commit**

```bash
git add "src/app/(authenticated)/upload/page.tsx"
git commit -m "feat: rewrite upload page for direct-to-Supabase flow with per-file progress"
```

---

### Task 5: Update External Upload Page for Direct Upload

**Files:**
- Modify: `src/app/upload/[token]/page.tsx`

**Step 1: Rewrite handleUpload with same direct flow**

Apply the same split logic: ZIPs through `/api/upload`, non-ZIPs through prepare/upload/complete. Add file size validation with 50MB limit. Show per-file errors.

Key changes:
- Add `MAX_FILE_SIZE` constant (50MB)
- Add file size checking when files are selected
- Split upload into ZIP (FormData) and direct (signed URL) paths
- Show per-file status (done/error)
- Update size text from "2GB" to "50MB"

**Step 2: Build and verify**

Run: build command
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/upload/[token]/page.tsx
git commit -m "feat: update external upload page for direct-to-Supabase flow"
```

---

### Task 6: Update vercel.json and Final Build

**Files:**
- Modify: `vercel.json`

**Step 1: Add new routes to vercel.json**

Add the prepare and complete routes with appropriate timeouts:

```json
{
  "functions": {
    "src/app/api/assets/download-zip/route.ts": { "maxDuration": 60 },
    "src/app/api/assets/[id]/download/route.ts": { "maxDuration": 60 },
    "src/app/api/upload/route.ts": { "maxDuration": 60 },
    "src/app/api/upload/prepare/route.ts": { "maxDuration": 30 },
    "src/app/api/upload/complete/route.ts": { "maxDuration": 60 },
    "src/app/api/export/route.ts": { "maxDuration": 60 }
  }
}
```

**Step 2: Final build**

Run: full build command
Expected: Build succeeds. New routes visible: `/api/upload/prepare`, `/api/upload/complete`

**Step 3: Final commit and push**

```bash
git add vercel.json
git commit -m "chore: add new upload routes to vercel.json"
git push origin main
```
