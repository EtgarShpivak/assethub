# Unified Activity Log — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge System Log + Activity Log into a single unified page with comprehensive logging for uploads, searches, admin CRUD, and errors — each entry enriched with IP, User-Agent, and login method.

**Architecture:** Create a centralized `logActivity()` server helper that all API routes call. It extracts IP/User-Agent from request headers, resolves user profile + auth provider, and inserts non-blocking into `activity_log`. Replace the two log pages with a single tabbed page at `/activity`.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Auth), TypeScript, Tailwind CSS, lucide-react icons.

---

## Task 1: Create centralized `logActivity()` helper

**Files:**
- Create: `src/lib/activity-logger.ts`

**Context:** Currently logging is scattered: `logServerError` in `src/lib/error-logger-server.ts` inserts errors, client-side `fetch('/api/activity', { method: 'POST' })` in `assets/page.tsx` logs edits/archives, and direct `supabase.from('activity_log').insert(...)` calls exist in `assets/[id]/download/route.ts` and `cron/cleanup-expired/route.ts`. We need ONE helper all API routes use.

**Step 1: Create the activity-logger.ts file**

```typescript
// src/lib/activity-logger.ts
import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface LogActivityOptions {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  userId?: string | null;
  userName?: string | null;
  workspaceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized activity logger for all API routes.
 * Extracts IP, User-Agent from request and resolves user profile.
 * Non-blocking — never throws, never slows down the main request.
 */
export async function logActivity(
  request: NextRequest | null,
  opts: LogActivityOptions
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Extract IP and User-Agent from request headers
    const ip = request
      ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      : 'system';
    const userAgent = request
      ? request.headers.get('user-agent') || 'unknown'
      : 'system';

    // Resolve user profile if userId provided but no userName
    let resolvedUserName = opts.userName || null;
    let resolvedWorkspaceId = opts.workspaceId || null;
    let loginMethod: string | null = null;

    if (opts.userId) {
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, email, workspace_ids')
        .eq('id', opts.userId)
        .single();

      if (profile) {
        resolvedUserName = resolvedUserName || profile.display_name || profile.email || 'משתמש';
        resolvedWorkspaceId = resolvedWorkspaceId || profile.workspace_ids?.[0] || null;
      }

      // Get login method from Supabase auth
      const { data: authUser } = await supabase.auth.admin.getUserById(opts.userId);
      if (authUser?.user) {
        loginMethod = authUser.user.app_metadata?.provider ||
                      authUser.user.identities?.[0]?.provider ||
                      'email';
      }
    }

    await supabase.from('activity_log').insert({
      workspace_id: resolvedWorkspaceId,
      user_id: opts.userId || null,
      user_name: resolvedUserName || 'מערכת',
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId || null,
      entity_name: opts.entityName || null,
      metadata: {
        ...opts.metadata,
        ip,
        user_agent: userAgent,
        login_method: loginMethod,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Never let logging break the main flow
    console.error('[ActivityLogger] Failed to log:', err);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/activity-logger.ts
git commit -m "feat: add centralized logActivity() helper with IP/UA/login tracking"
```

---

## Task 2: Add upload logging

**Files:**
- Modify: `src/app/api/upload/complete/route.ts` (add logging after successful DB insert, ~line 173)
- Modify: `src/app/api/upload/route.ts` (add logging after successful DB insert in ZIP upload path)

**Context:** `upload/complete/route.ts` handles the 3-phase direct upload. After the loop processes each file, if `asset` is successfully inserted (line 173 `results.push(asset)`), log the upload. Similarly, `upload/route.ts` handles ZIP uploads and has a similar success path around lines 300-320 where assets are inserted.

**Step 1: Add logging to upload/complete/route.ts**

At the top, add import:
```typescript
import { logActivity } from '@/lib/activity-logger';
```

After `results.push(asset);` (line 173), add:
```typescript
        // Log successful upload
        logActivity(request, {
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
```

**Step 2: Add logging to upload/route.ts (ZIP path)**

Read the file to find the ZIP upload success path. At the top, add import:
```typescript
import { logActivity } from '@/lib/activity-logger';
```

After each successful asset insertion in the ZIP processing loop, add similar logActivity call with `upload_method: 'zip'`.

**Step 3: Commit**

```bash
git add src/app/api/upload/complete/route.ts src/app/api/upload/route.ts
git commit -m "feat: log uploads to activity_log with file metadata"
```

---

## Task 3: Add search logging

**Files:**
- Modify: `src/app/api/assets/route.ts` (add logging at end of GET handler, ~line 215)

**Context:** The assets GET endpoint handles all search/filter queries. We should log when users search (when there are active filters), not on every page view. Check if any filter params exist (search, slug_id, file_type, tag, etc.) and only log if there's an active search.

**Step 1: Add search logging to assets/route.ts**

At the top, add import:
```typescript
import { logActivity } from '@/lib/activity-logger';
```

Before the final `return NextResponse.json(...)` at the end of the GET handler (line 215), add:
```typescript
  // Log searches (only when filters are active, not bare page loads)
  const hasActiveFilters = slugId || initiativeId || fileType || platform ||
    aspectRatio || dimensions || domainCtx || assetType || dateFrom || dateTo ||
    search || tag || unclassified || expiry;

  if (hasActiveFilters) {
    // Fire-and-forget — don't await
    logActivity(request, {
      action: 'search',
      entityType: 'search',
      entityName: search || 'חיפוש מסננים',
      userId: user.id,
      metadata: {
        filters: {
          search: search || null,
          slug_id: slugId || null,
          initiative_id: initiativeId || null,
          file_type: fileType || null,
          platform: platform || null,
          aspect_ratio: aspectRatio || null,
          domain_context: domainCtx || null,
          asset_type: assetType || null,
          tag: tag || null,
          expiry: expiry || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        },
        result_count: count || 0,
        page,
      },
    });
  }
```

**Step 2: Commit**

```bash
git add src/app/api/assets/route.ts
git commit -m "feat: log asset searches to activity_log with filter details"
```

---

## Task 4: Add CRUD logging to all management routes

**Files:**
- Modify: `src/app/api/slugs/route.ts` (POST — log slug creation)
- Modify: `src/app/api/slugs/[id]/route.ts` (PATCH — log slug edit, DELETE — log slug delete)
- Modify: `src/app/api/initiatives/route.ts` (POST — log initiative creation)
- Modify: `src/app/api/initiatives/[id]/route.ts` (PATCH — log initiative edit, DELETE — log initiative archive)
- Modify: `src/app/api/collections/route.ts` (POST — log collection creation)
- Modify: `src/app/api/collections/[id]/route.ts` (PATCH — log collection edit, DELETE — log collection delete)
- Modify: `src/app/api/tags/route.ts` (PUT — log tag rename, DELETE — log tag delete)

**Context:** None of these routes currently log anything. Each needs an import of `logActivity` and a call after the successful operation.

**Step 1: Add logging to slugs/route.ts POST**

After successful insert returns `data` (~line 80, before the `return NextResponse.json(data, { status: 201 })`):
```typescript
  logActivity(request, {
    action: 'create',
    entityType: 'slug',
    entityId: data.id,
    entityName: data.display_name,
    userId: user.id,
    metadata: { slug: data.slug, display_name: data.display_name, description: data.description },
  });
```

**Step 2: Add logging to slugs/[id]/route.ts**

PATCH — after successful update:
```typescript
  logActivity(request, {
    action: 'edit',
    entityType: 'slug',
    entityId: params.id,
    entityName: data.display_name || data.slug,
    userId: user.id,
    metadata: { changes: body },
  });
```

DELETE — after successful delete (before `return NextResponse.json({ success: true })`):
```typescript
  logActivity(_request, {
    action: 'delete',
    entityType: 'slug',
    entityId: params.id,
    userId: user.id,
  });
```

**Step 3: Add logging to initiatives/route.ts POST**

After successful insert:
```typescript
  logActivity(request, {
    action: 'create',
    entityType: 'initiative',
    entityId: data.id,
    entityName: data.name,
    userId: user.id,
    metadata: { short_code: data.short_code, status: data.status },
  });
```

**Step 4: Add logging to initiatives/[id]/route.ts**

PATCH — after successful update:
```typescript
  logActivity(request, {
    action: 'edit',
    entityType: 'initiative',
    entityId: params.id,
    entityName: data.name,
    userId: user.id,
    metadata: { changes: body },
  });
```

DELETE — after successful archive:
```typescript
  logActivity(_request, {
    action: 'archive',
    entityType: 'initiative',
    entityId: params.id,
    userId: user.id,
  });
```

**Step 5: Add logging to collections/route.ts POST**

After successful insert:
```typescript
  logActivity(request, {
    action: 'create',
    entityType: 'collection',
    entityId: collection.id,
    entityName: name,
    userId: user.id,
    workspaceId: workspaceId,
    metadata: { is_shared: is_shared || false, asset_count: asset_ids?.length || 0 },
  });
```

**Step 6: Add logging to collections/[id]/route.ts**

PATCH — after successful update:
```typescript
  logActivity(request, {
    action: 'edit',
    entityType: 'collection',
    entityId: params.id,
    userId: user.id,
    metadata: {
      added_assets: body.add_asset_ids?.length || 0,
      removed_assets: body.remove_asset_ids?.length || 0,
      metadata_changes: Object.keys(updates),
    },
  });
```

DELETE — after successful delete:
```typescript
  logActivity(_request, {
    action: 'delete',
    entityType: 'collection',
    entityId: params.id,
    userId: user.id,
  });
```

**Step 7: Add logging to tags/route.ts**

PUT (rename) — after loop completes:
```typescript
  logActivity(request, {
    action: 'edit',
    entityType: 'tag',
    entityName: `${oldName} → ${newName}`,
    userId: user.id,
    metadata: { old_name: oldName, new_name: newName, affected_assets: updated },
  });
```

DELETE — after loop completes:
```typescript
  logActivity(request, {
    action: 'delete',
    entityType: 'tag',
    entityName: name,
    userId: user.id,
    metadata: { affected_assets: updated },
  });
```

**Step 8: Commit**

```bash
git add src/app/api/slugs/route.ts src/app/api/slugs/\[id\]/route.ts \
  src/app/api/initiatives/route.ts src/app/api/initiatives/\[id\]/route.ts \
  src/app/api/collections/route.ts src/app/api/collections/\[id\]/route.ts \
  src/app/api/tags/route.ts
git commit -m "feat: add activity logging to all CRUD routes (slugs, initiatives, collections, tags)"
```

---

## Task 5: Update logServerError to include IP/User-Agent

**Files:**
- Modify: `src/lib/error-logger-server.ts`

**Context:** The existing `logServerError()` function logs errors but doesn't capture IP/user-agent. Add an optional `request` parameter so API routes can pass the NextRequest.

**Step 1: Update the function signature and implementation**

Add optional `request?: NextRequest` parameter to `ServerErrorOptions`. Extract IP and user-agent when available and include in metadata.

```typescript
import { NextRequest } from 'next/server';

interface ServerErrorOptions {
  context: string;
  errorMessage: string;
  userId?: string | null;
  userName?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  entityType?: string;
  extra?: Record<string, unknown>;
  request?: NextRequest;  // NEW — pass request to capture IP/UA
}
```

Inside the function, before the insert:
```typescript
    const ip = opts.request
      ? opts.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        opts.request.headers.get('x-real-ip') || 'unknown'
      : null;
    const userAgent = opts.request
      ? opts.request.headers.get('user-agent') || 'unknown'
      : null;
```

Add to metadata:
```typescript
      metadata: {
        level: 'error',
        error_message: opts.errorMessage,
        context: opts.context,
        timestamp: new Date().toISOString(),
        ...(ip ? { ip } : {}),
        ...(userAgent ? { user_agent: userAgent } : {}),
        ...(opts.extra || {}),
      },
```

**Step 2: Update all logServerError callers to pass request**

The callers are:
- `src/app/api/upload/route.ts` — multiple calls (lines ~322, 370, 385)
- `src/app/api/upload/prepare/route.ts` — line ~152
- `src/app/api/upload/complete/route.ts` — lines ~166, 179
- `src/app/api/archive/route.ts` — lines ~26, 59, 86, 105
- `src/app/api/collections/route.ts` — line ~73

Add `request` to each `logServerError(...)` call. For handlers that have access to `request` (NextRequest parameter), pass it. For handlers that use `_request`, rename to `request` and pass it.

**Step 3: Commit**

```bash
git add src/lib/error-logger-server.ts src/app/api/upload/route.ts \
  src/app/api/upload/prepare/route.ts src/app/api/upload/complete/route.ts \
  src/app/api/archive/route.ts src/app/api/collections/route.ts
git commit -m "feat: pass request to logServerError for IP/UA tracking in errors"
```

---

## Task 6: Upgrade the activity API route

**Files:**
- Modify: `src/app/api/activity/route.ts` (replace with full system-log features)

**Context:** The current `/api/activity` is simple (basic filters, no stats, no users list). The `/api/system-log` is rich (all filters, stats, users). We upgrade `/api/activity` to have all the system-log features plus tab-based filtering. The GET handler should NOT require admin role — just authentication. The POST handler stays for backwards compatibility.

**Step 1: Replace the GET handler**

The new GET handler should:
1. Accept all filter params: `limit`, `offset`, `tab` (all/uploads/searches/management/errors), `action`, `entity_type`, `user_id`, `date_from`, `date_to`, `search`
2. Map tabs to query filters:
   - `uploads` → `action = 'upload'`
   - `searches` → `entity_type = 'search'`
   - `management` → `entity_type IN ('slug', 'initiative', 'collection', 'tag')`
   - `errors` → `action = 'error'`
   - `all` → no extra filter
3. Return: `{ entries, total, users, stats: { totalEvents, errorCount, todayCount, uploadCount, searchCount } }`

```typescript
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');
  const tab = searchParams.get('tab') || 'all';
  const action = searchParams.get('action');
  const entityType = searchParams.get('entity_type');
  const userId = searchParams.get('user_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const search = searchParams.get('search');

  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Tab-based filtering
  if (tab === 'uploads') {
    query = query.eq('action', 'upload');
  } else if (tab === 'searches') {
    query = query.eq('entity_type', 'search');
  } else if (tab === 'management') {
    query = query.in('entity_type', ['slug', 'initiative', 'collection', 'tag']);
  } else if (tab === 'errors') {
    query = query.eq('action', 'error');
  }

  // Additional filters (on top of tab)
  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);
  if (userId) query = query.eq('user_id', userId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
  if (search) query = query.or(`entity_name.ilike.%${search}%,user_name.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Users list for filter dropdown
  const { data: users } = await supabase
    .from('activity_log')
    .select('user_id, user_name')
    .not('user_id', 'is', null);

  const userMap = new Map<string, string>();
  (users || []).forEach(u => {
    if (u.user_id && u.user_name) userMap.set(u.user_id, u.user_name);
  });
  const uniqueUsers = Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));

  // Stats
  const [errorRes, todayRes, uploadRes, searchRes] = await Promise.all([
    supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('action', 'error'),
    supabase.from('activity_log').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('action', 'upload'),
    supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('entity_type', 'search'),
  ]);

  return NextResponse.json({
    entries: data || [],
    total: count || 0,
    users: uniqueUsers,
    stats: {
      totalEvents: count || 0,
      errorCount: errorRes.count || 0,
      todayCount: todayRes.count || 0,
      uploadCount: uploadRes.count || 0,
      searchCount: searchRes.count || 0,
    },
  });
}
```

Keep the existing POST handler unchanged.

**Step 2: Commit**

```bash
git add src/app/api/activity/route.ts
git commit -m "feat: upgrade activity API with full filtering, stats, and tab support"
```

---

## Task 7: Build the unified log UI page

**Files:**
- Modify: `src/app/(authenticated)/activity/page.tsx` (replace with enhanced system-log UI)

**Context:** The current system-log page at `src/app/(authenticated)/admin/system-log/page.tsx` is 860 lines with rich UI. We copy its structure to `/activity/page.tsx` with these changes:
1. Remove admin check — all authenticated users can view
2. Replace 2 tabs (all/errors) with 5 tabs: הכל, העלאות, חיפושים, ניהול, שגיאות
3. Change API endpoint from `/api/system-log` to `/api/activity`
4. Add `tab` param to API calls
5. Add IP, User-Agent, Login Method display in expanded rows
6. Update header: "יומן פעילות" instead of "לוג מערכת (אדמין)"
7. Update stats bar to show upload count and search count too
8. Add 'search', 'tag', 'download', 'auto_delete_expired' to ACTION_LABELS
9. Add 'search', 'slug', 'tag' to ENTITY_TYPE_LABELS

**Key UI changes in expanded metadata section:**

Add dedicated fields for IP, User-Agent, Login Method BEFORE the generic metadata display:
```tsx
{/* Request info */}
{entry.metadata?.ip && (
  <div>
    <span className="text-xs text-ono-gray font-medium">כתובת IP</span>
    <p className="text-ono-gray-dark font-mono text-xs mt-0.5">{String(entry.metadata.ip)}</p>
  </div>
)}
{entry.metadata?.user_agent && (
  <div className="sm:col-span-2">
    <span className="text-xs text-ono-gray font-medium">דפדפן (User Agent)</span>
    <p className="text-ono-gray-dark font-mono text-xs mt-0.5 truncate">{String(entry.metadata.user_agent)}</p>
  </div>
)}
{entry.metadata?.login_method && (
  <div>
    <span className="text-xs text-ono-gray font-medium">שיטת התחברות</span>
    <p className="text-ono-gray-dark text-xs mt-0.5">
      <Badge variant="outline" className="text-[10px]">
        {String(entry.metadata.login_method)}
      </Badge>
    </p>
  </div>
)}
```

**Step 1: Write the new `/activity/page.tsx`**

The full page should be based on the system-log page structure (~860 lines) with the modifications above. Key changes:
- Remove `isAdmin` state, `checkAdmin()` useEffect, and the access-denied render block
- Change `activeTab` type from `'all' | 'errors'` to `'all' | 'uploads' | 'searches' | 'management' | 'errors'`
- Change fetch URL from `/api/system-log` to `/api/activity` with `tab` param
- Add 5 tabs in the tab bar
- Update ACTION_LABELS to include: `search: 'חיפוש'`, `download: 'הורדה'`, `auto_delete_expired: 'מחיקה אוטומטית'`, `rename: 'שינוי שם'`
- Update ENTITY_TYPE_LABELS to include: `search: 'חיפוש'`, `slug: 'סלאג'`, `tag: 'תגית'`
- Add IP/UA/login method to expanded details
- Update stats bar to 5 cards (total, uploads, searches, errors, today)
- Change header icon from `Shield` to `ScrollText` and text to "יומן פעילות"

**Step 2: Commit**

```bash
git add src/app/\(authenticated\)/activity/page.tsx
git commit -m "feat: unified activity log page with 5 tabs, IP/UA/login tracking"
```

---

## Task 8: Cleanup and sidebar update

**Files:**
- Delete: `src/app/(authenticated)/admin/system-log/page.tsx`
- Delete: `src/app/api/system-log/route.ts`
- Modify: `src/components/layout/sidebar.tsx` (remove old system-log entry)

**Context:** After the unified page is working, we clean up the old files and update navigation.

**Step 1: Update sidebar.tsx**

In the `navEntries` array, find the 'הגדרות' group (lines 59-67). Remove the system-log entry:
```typescript
// Before:
{ href: '/activity', label: 'יומן פעילות', icon: ScrollText },
{ href: '/admin/system-log', label: 'לוג מערכת', icon: ShieldAlert, adminOnly: true },

// After:
{ href: '/activity', label: 'יומן פעילות', icon: ScrollText },
```

Remove `ShieldAlert` from the lucide-react imports if no longer used.

**Step 2: Delete old files**

```bash
rm src/app/\(authenticated\)/admin/system-log/page.tsx
rm src/app/api/system-log/route.ts
```

Check if `/admin/` directory is now empty and can be removed:
```bash
ls src/app/\(authenticated\)/admin/
# If empty, remove the directory
```

**Step 3: Remove client-side activity logging from assets page**

In `src/app/(authenticated)/assets/page.tsx`, find the two `fetch('/api/activity', { method: 'POST' ...})` calls for edit and archive actions (around lines 554 and 1195). These are now redundant since we're logging from the server-side API routes. Remove them.

NOTE: The edit action is logged client-side in assets page but the actual edit goes through `src/app/api/assets/[id]/route.ts`. Check if that route exists and add server-side logging there instead.

**Step 4: Build and verify**

```bash
export PATH="/c/Program Files/nodejs:/c/Windows/System32:$PATH"
cd /c/code/assethub
node node_modules/next/dist/bin/next build
```

Fix any TypeScript or build errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old system-log page, update sidebar, clean up client-side logging"
```

---

## Task 9: Final build, push, and verify

**Files:** None (build verification)

**Step 1: Full build**

```bash
export PATH="/c/Program Files/nodejs:/c/Windows/System32:$PATH"
cd /c/code/assethub
node node_modules/next/dist/bin/next build
```

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Step 3: Verify on Vercel**

Check that the build deploys successfully at `assethub-seven.vercel.app`.
