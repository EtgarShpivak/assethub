# Content Expiry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expiry date to uploads, show in asset library, auto-delete expired via daily cron.

**Architecture:** The `expires_at` column already exists in DB and TypeScript types. We add a UI field on upload, pass it through all 3 upload paths to the DB insert, add a filter + badge on assets page, and create a Vercel cron job that deletes expired files daily.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Storage), Vercel Cron, TypeScript, RTL Hebrew UI.

---

### Task 1: Add Expiry Field to Upload Page

**Files:**
- Modify: `src/app/(authenticated)/upload/page.tsx`

**What:** Add expiry date picker to classification panel, send `expires_at` in all upload paths.

**Step 1: Add state variables**

After line 77 (`const [uploadDate, setUploadDate] = ...`), add:

```tsx
const [noExpiry, setNoExpiry] = useState(true);
const [expiresAt, setExpiresAt] = useState('');
```

**Step 2: Add UI field in classification panel**

After the upload date field (the `<div>` containing "תאריך המסמך המקורי", around line 585-589), add a new grid cell:

```tsx
<div>
  <Label className="flex items-center gap-1">תוקף תוכן <InfoTooltip text="הגדירו תאריך תפוגה לתוכן. לאחר התאריך התוכן יימחק אוטומטית מהמערכת." /></Label>
  <div className="flex items-center gap-2 mt-1">
    <Checkbox checked={noExpiry} onCheckedChange={(c) => { setNoExpiry(!!c); if (c) setExpiresAt(''); }} className="h-4 w-4" />
    <span className="text-sm text-ono-gray-dark">ללא הגבלת תוקף</span>
  </div>
  {!noExpiry && (
    <Input type="date" className="mt-2" dir="ltr" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} />
  )}
</div>
```

**Step 3: Pass `expires_at` in ZIP upload path**

In `handleUpload`, find the `formData.append` block for ZIP files (around line 176-184). After `formData.append('upload_date', uploadDate)`, add:

```tsx
if (expiresAt) formData.append('expires_at', new Date(expiresAt).toISOString());
```

**Step 4: Pass `expires_at` in direct upload prepare call**

In the prepare JSON body (around line 220-227), add `expires_at`:

```tsx
expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
```

**Step 5: Pass `expires_at` in direct upload complete call**

In the complete JSON body (around line 305-321), add `expires_at`:

```tsx
expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
```

**Step 6: Verify build**

Run: `node node_modules/next/dist/bin/next build`

---

### Task 2: Accept `expires_at` in API Routes

**Files:**
- Modify: `src/app/api/upload/route.ts` (ZIP upload)
- Modify: `src/app/api/upload/complete/route.ts` (direct upload)
- No change needed for `prepare` route (it only generates signed URLs, doesn't touch DB)

**Step 1: ZIP upload route — read and pass `expires_at`**

In `src/app/api/upload/route.ts`, after line 165 (`const fileTypeOverride = ...`), add:

```ts
const expiresAt = formData.get('expires_at') as string | null;
```

In the same file's `.insert({` block (around line 339-362), add after `file_hash: fileHash,`:

```ts
expires_at: expiresAt || null,
```

**Step 2: Complete route — read and pass `expires_at`**

In `src/app/api/upload/complete/route.ts`, update the destructuring (lines 34-47):

Add `expires_at` to the destructured body:

```ts
const {
  files, slug_id, workspace_id, initiative_id,
  domain_context, platforms, tags, upload_date, asset_type, expires_at,
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
};
```

In the `.insert({` block (around line 135-158), add after `file_hash: fileHash,`:

```ts
expires_at: expires_at || null,
```

**Step 3: Verify build**

Run: `node node_modules/next/dist/bin/next build`

---

### Task 3: Add Expiry to External Upload Page

**Files:**
- Modify: `src/app/upload/[token]/page.tsx`

**What:** Same expiry UI as main upload page. The external upload page also has ZIP and direct upload paths.

**Step 1: Add state variables and UI**

Same pattern as Task 1: add `noExpiry`/`expiresAt` state, add the checkbox + date input after the file list.

**Step 2: Pass `expires_at` in upload calls**

Same pattern as Task 1 Steps 3-5: append to formData for ZIPs, add to JSON body for direct uploads.

**Step 3: Verify build**

---

### Task 4: Expiry Display in Asset Library

**Files:**
- Modify: `src/app/(authenticated)/assets/page.tsx`
- Modify: `src/app/api/assets/route.ts`

**Step 1: Add expiry filter state**

In the assets page, after `const [filterTag, setFilterTag] = useState('')` (line 144), add:

```tsx
const [filterExpiry, setFilterExpiry] = useState('');
```

**Step 2: Add expiry filter to fetch query**

In `fetchAssets` (the function that builds URL params), add:

```tsx
if (filterExpiry) params.set('expiry', filterExpiry);
```

**Step 3: Add filter UI in sidebar**

In the filter sidebar section, add after the tag filter:

```tsx
<div>
  <Label className="text-xs mb-1.5 block">תוקף</Label>
  <select value={filterExpiry} onChange={e => setFilterExpiry(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-1.5 text-xs">
    <option value="">הכל</option>
    <option value="valid">בתוקף</option>
    <option value="expired">פג תוקף</option>
    <option value="expiring_soon">פוקע ב-30 יום</option>
  </select>
</div>
```

**Step 4: Show expiry badge on grid/list items**

In the asset card/row rendering, add an expiry badge (same style already used in detail view):

```tsx
{asset.expires_at && (
  <Badge variant="outline" className={`text-[10px] ${new Date(asset.expires_at) < new Date() ? 'border-red-300 text-red-600' : 'border-orange-300 text-orange-600'}`}>
    <Clock className="w-3 h-3 ml-0.5" />
    {new Date(asset.expires_at) < new Date() ? 'פג תוקף' : `עד ${new Date(asset.expires_at).toLocaleDateString('he-IL')}`}
  </Badge>
)}
```

**Step 5: API route — add expiry filter**

In `src/app/api/assets/route.ts`, after the tag filter block (around line 181), add:

```ts
// Expiry filter
const expiry = searchParams.get('expiry');
if (expiry === 'valid') {
  query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
} else if (expiry === 'expired') {
  query = query.not('expires_at', 'is', null).lt('expires_at', new Date().toISOString());
} else if (expiry === 'expiring_soon') {
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  query = query.not('expires_at', 'is', null)
    .gte('expires_at', new Date().toISOString())
    .lte('expires_at', in30Days.toISOString());
}
```

**Step 6: Verify build**

---

### Task 5: Auto-Delete Cron Job

**Files:**
- Create: `src/app/api/cron/cleanup-expired/route.ts`
- Modify: `vercel.json` (add cron config)

**Step 1: Create cleanup route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Find expired assets
  const { data: expired, error } = await supabase
    .from('assets')
    .select('id, stored_filename, drive_file_id, original_filename, workspace_id')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .limit(100); // Process in batches

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'No expired assets' });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const asset of expired) {
    try {
      // Delete from storage
      if (asset.drive_file_id) {
        await supabase.storage.from('assets').remove([asset.drive_file_id]);
      }

      // Delete from DB
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      if (deleteError) {
        errors.push(`${asset.original_filename}: ${deleteError.message}`);
      } else {
        deleted++;
      }
    } catch (err) {
      errors.push(`${asset.original_filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Log to activity_log
  await supabase.from('activity_log').insert({
    workspace_id: expired[0]?.workspace_id || null,
    user_id: null,
    user_name: 'מערכת (Cron)',
    action: 'auto_delete_expired',
    entity_type: 'system',
    entity_id: null,
    entity_name: 'cleanup-expired',
    metadata: {
      deleted,
      errors: errors.length,
      error_details: errors,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({ deleted, errors });
}
```

**Step 2: Update vercel.json**

Add crons config and the function entry:

```json
{
  "functions": {
    ...existing...
    "src/app/api/cron/cleanup-expired/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [{
    "path": "/api/cron/cleanup-expired",
    "schedule": "0 3 * * *"
  }]
}
```

**Step 3: Add `CRON_SECRET` env var**

User must add `CRON_SECRET` environment variable in Vercel dashboard. Vercel automatically sends this as `Authorization: Bearer <CRON_SECRET>` header when invoking cron jobs.

**Step 4: Verify build**

---

### Task 6: Commit and Push

**Step 1: Build final verification**

Run: `node node_modules/next/dist/bin/next build`
Expected: All pages compile, no TypeScript errors.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: content expiry — upload field, library display, auto-delete cron"
```

**Step 3: Push**

```bash
git push
```

**Step 4: Post-deploy**

User needs to:
1. Add `CRON_SECRET` env var in Vercel dashboard (any random string)
2. Verify cron appears in Vercel dashboard under Settings > Crons
