# Direct Upload to Supabase + Nested ZIP + Size Limit Display

**Date:** 2026-02-28
**Status:** Approved

## Problems

1. **Video upload fails** — Vercel Hobby plan has 4.5MB body limit on serverless functions. Files >4.5MB never reach our API route.
2. **Nested ZIPs not extracted** — JSZip extracts one level only. ZIPs inside ZIPs are skipped.
3. **No feedback on size-limited files** — When upload fails due to size, user gets a generic error with no indication which files failed.

## Design

### Architecture: Direct-to-Supabase Upload

Non-ZIP files bypass Vercel entirely:

```
Browser → POST /api/upload/prepare (metadata only, ~1KB)
        ← {signedUrls[], fileMap}
Browser → PUT file directly to Supabase Storage (up to 50MB per file)
        ← 200 OK
Browser → POST /api/upload/complete (metadata only, ~2KB)
        ← {uploaded[], errors[]}
```

ZIP files continue through the existing `/api/upload` route (they need server-side extraction and are typically small).

### New API: POST /api/upload/prepare

**Input:** `{ files: [{name, size, type}], slug_id, workspace_id, initiative_id, domain_context, platforms, tags, upload_date, asset_type }`

**Logic:**
1. Validate auth
2. Validate each file: type allowed, size <= 50MB
3. Fetch slug/workspace info for smart naming
4. Generate storage paths with smart naming convention (slug-campaign-date-type-ratiosize-NN.ext)
5. Create signed upload URLs via `supabase.storage.createSignedUploadUrl(path)`
6. Return: `{ files: [{ originalName, storagePath, signedUrl, token }], errors: [{ file, error }] }`

### New API: POST /api/upload/complete

**Input:** `{ files: [{ storagePath, originalName, size, type, width?, height? }], slug_id, workspace_id, initiative_id, domain_context, platforms, tags, upload_date, asset_type }`

**Logic:**
1. Validate auth
2. For images: use sharp on the stored file to extract dimensions (download from storage → process → get metadata)
3. Compute file hash from storage
4. Insert asset records into DB
5. Log activity
6. Return: `{ uploaded: [...], errors: [...] }`

### ZIP Handling: Nested Extraction

Keep existing `/api/upload` route for ZIPs. Add recursive extraction:
- When extracting a ZIP and finding a `.zip` entry inside, extract it recursively
- Max recursion depth: 3 levels
- Skip hidden/system files at all levels
- Only extract files with EXTRACTABLE_EXTENSIONS

### Client-Side Upload Flow (upload/page.tsx)

1. **Pre-validation:** Check each file size against 50MB. Reject oversized files with Hebrew error showing filename and size.
2. **Split by type:** ZIP files → existing `/api/upload`. Non-ZIP files → new prepare/upload/complete flow.
3. **Upload sequence:**
   a. Call `/api/upload/prepare` with file metadata
   b. Upload each file directly to Supabase using signed URL (with XHR for progress tracking)
   c. Call `/api/upload/complete` with successful uploads
4. **Per-file status:** Show individual upload progress (pending → uploading with % → done/error)
5. **Error display:** Files that fail show filename, size, and specific Hebrew error message in red

### Size Limit Error Display

- Files > 50MB: shown in file list with red bg, message: "הקובץ גדול מדי (XX MB). הגודל המקסימלי הוא 50MB"
- Files rejected by prepare route: shown with specific error from server
- Files that fail during direct upload: shown with upload error details
- All valid files still upload even if some are rejected

### External Upload Page (/upload/[token])

Update token-based upload page to use the same direct-upload flow.

## Constraints

- Vercel Hobby: 4.5MB body limit, 60s function timeout
- Supabase Free: 50MB file size limit per upload
- Signed URLs expire after a configurable duration (use 1 hour)
