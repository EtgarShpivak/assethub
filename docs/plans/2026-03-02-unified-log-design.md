# Unified Activity Log — Design Document

## Goal

Merge the System Log (admin-only, rich UI) and Activity Log (user-facing, simple timeline) into a single unified log page. Add comprehensive logging for all user actions (uploads, searches, admin CRUD) with IP, User-Agent, and login method tracking.

## Current State

- Two pages: `/admin/system-log` (rich, 860 lines, admin-only) and `/activity` (simple, 257 lines, all users)
- Both query the **same** `activity_log` table
- Only errors, downloads, archive, and edit are currently logged
- **Missing**: upload logging, search logging, slug/initiative/collection/tag CRUD logging
- **Missing**: IP, user-agent, login method per entry

## Architecture

### Unification

1. **Keep** the system log's rich UI (filters, pagination, stats, expandable rows, table)
2. **Move** from `/admin/system-log` → `/activity` (replace the simple page)
3. **Remove** admin-only restriction — all authenticated users can view
4. **Delete** old activity page and its API route
5. **Update** sidebar navigation

### New Tab System

| Tab | entity_type filter | Description |
|-----|-------------------|-------------|
| הכל | (none) | All events |
| העלאות | `asset` + action=`upload` | Upload details |
| חיפושים | `search` | Search queries |
| ניהול | `slug`,`initiative`,`collection`,`tag` | Admin CRUD |
| שגיאות | action=`error` | Errors only |

### Data Capture — No Schema Change

Store IP, user_agent, and login_method in the existing `metadata` JSONB field:

```json
{
  "ip": "1.2.3.4",
  "user_agent": "Mozilla/5.0...",
  "login_method": "google",
  "...": "other action-specific data"
}
```

### Centralized `logActivity()` Helper

New file: `src/lib/activity-logger.ts`

```typescript
export async function logActivity(
  request: NextRequest | null,
  opts: {
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    userId?: string;
    userName?: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void>
```

- Extracts IP from `x-forwarded-for` or `x-real-ip` headers
- Extracts User-Agent from `user-agent` header
- Looks up user profile for display name and login method (from Supabase auth)
- Non-blocking (fire-and-forget with try/catch)
- All API routes call this instead of direct inserts

### Logging Points

| Action | API Route | entity_type | metadata |
|--------|-----------|-------------|----------|
| upload | upload/route.ts, upload/complete/route.ts | asset | filename, file_type, size, slug, initiative, expires_at |
| search | assets/route.ts GET | search | query params, result_count |
| create | slugs/route.ts POST | slug | slug, display_name |
| edit | slugs/[id]/route.ts PATCH | slug | changed fields |
| delete | slugs/[id]/route.ts DELETE | slug | slug name |
| create | initiatives/route.ts POST | initiative | name, status |
| edit | initiatives/[id]/route.ts PATCH | initiative | changed fields |
| delete | initiatives/[id]/route.ts DELETE | initiative | name |
| create | collections/route.ts POST | collection | name |
| edit | collections/ PATCH | collection | changed fields |
| delete | collections/ DELETE | collection | name |
| create | tags/ POST | tag | tag name |
| delete | tags/ DELETE | tag | tag name |

### Unified UI

- 5 tabs replacing the current 2-tab (All/Errors) system
- Keep: search bar, action filter, entity type filter, user filter, date range
- Add: IP column and User-Agent in expandable metadata row
- Add: Login method badge next to username
- Keep: stats bar, pagination, expandable rows

## Tech Decisions

- **No schema migration** — metadata JSONB handles all new fields
- **Server-side logging only** — move client-side logging (edit, archive) to their API routes
- **Non-blocking** — `logActivity` wrapped in try/catch, never blocks user actions
- **Vercel-compatible** — no background workers, all logging inline in API handlers
