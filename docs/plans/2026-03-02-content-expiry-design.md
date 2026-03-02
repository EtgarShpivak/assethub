# Content Expiry — Design Document

**Date:** 2026-03-02
**Status:** Approved

## Overview

Add content expiry dates during upload, display expiry status in the asset library, and automatically delete expired content via a daily cron job.

## Existing Infrastructure

- `assets.expires_at TIMESTAMPTZ` column already exists in DB
- `Asset.expires_at: string | null` already in TypeScript types
- Assets detail view already shows/edits expiry — but upload flow ignores it entirely

## Part 1: Expiry Field in Upload Form

### Upload Page (`/upload/page.tsx`)
- New state: `expiresAt` (string, default `''`) and `noExpiry` (boolean, default `true`)
- Checkbox: "ללא הגבלת תוקף" — checked by default
- When unchecked: date input appears for choosing expiry date
- Field placed next to "תאריך המסמך המקורי" in the classification panel grid
- Value sent in all 3 upload paths:
  - ZIP path: `formData.append('expires_at', ...)` to `/api/upload`
  - Direct prepare: `expires_at` in JSON body to `/api/upload/prepare`
  - Direct complete: `expires_at` in JSON body to `/api/upload/complete`

### External Upload Page (`/upload/[token]/page.tsx`)
- Same expiry UI as main upload page

### API Routes
- `/api/upload/route.ts`: Read `expires_at` from formData, pass to asset insert
- `/api/upload/prepare/route.ts`: Accept `expires_at` in body, pass through
- `/api/upload/complete/route.ts`: Read `expires_at` from body, set on asset record

## Part 2: Display in Asset Library

### Badge on Assets
- Already exists in detail view — extend to grid/list views
- Orange badge: "תוקף עד DD/MM/YYYY" — still valid
- Red badge: "פג תוקף" — expired
- Clock icon on grid thumbnails for assets with expiry

### Expiry Filter
- New filter option in filter sidebar: "תוקף"
- Options: הכל / בתוקף / פג תוקף / פוקע ב-30 יום
- Filter applied via query parameter to `/api/assets`

## Part 3: Automatic Deletion — Vercel Cron

### Cron Route: `/api/cron/cleanup-expired`
- Vercel cron config in `vercel.json`: runs daily at 03:00 UTC
- Protected by `CRON_SECRET` header verification
- Finds all assets where `expires_at < now()`
- For each expired asset:
  1. Delete file from Supabase Storage
  2. Delete DB record
  3. Log to system_log table
- Returns summary: `{ deleted: N, errors: [] }`

### Vercel Config
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-expired",
    "schedule": "0 3 * * *"
  }]
}
```

## Data Flow

```
Upload Form → expires_at field
    ↓
API Routes → save expires_at to assets table
    ↓
Asset Library → show badge with expiry status
    ↓
Cron (daily 03:00) → find expired → delete from storage + DB → log
```
