# AssetHub - Developer Guide

## Overview

AssetHub is a digital asset management system built for Ono Academic College's marketing department. It enables teams to upload, organize, search, share, and export marketing assets (images, videos, PDFs, newsletters, briefs, and links).

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (serverless on Vercel)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Storage:** Supabase Storage (public CDN)
- **Auth:** Supabase Auth (email/password)
- **Hosting:** Vercel
- **Language:** Hebrew-first (RTL), with English toggle

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (with configured tables)

### Setup
```bash
git clone <repo-url>
cd assethub
npm install
cp .env.local.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

### Environment Variables
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Application URL (e.g., `http://localhost:3000`) |
| `CRON_SECRET` | Secret for cron job authentication |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (Optional) Google Drive integration |
| `GOOGLE_PRIVATE_KEY` | (Optional) Google Drive API key |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | (Optional) Google Drive root folder |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # Protected routes (require login)
│   │   ├── page.tsx              # Dashboard
│   │   ├── assets/               # Asset library
│   │   ├── upload/               # Upload page
│   │   ├── initiatives/          # Campaign management
│   │   ├── archive/              # Archived assets
│   │   ├── collections/          # Asset collections
│   │   ├── settings/             # Admin settings (users, tags, slugs)
│   │   ├── activity/             # Activity log (admin)
│   │   ├── reports/              # Analytics (admin)
│   │   ├── export/               # Data export
│   │   ├── guide/                # User guide
│   │   ├── help/                 # Help page
│   │   └── accessibility/        # Accessibility statement
│   ├── api/                      # REST API endpoints
│   ├── login/                    # Login page
│   ├── set-password/             # Password setup for invited users
│   ├── auth/callback/            # OAuth callback handler
│   ├── shared/[token]/           # Public shared assets page
│   └── upload/[token]/           # External upload via token
├── components/
│   ├── ui/                       # Reusable UI components (Shadcn-style)
│   ├── assets/                   # Asset-specific components
│   ├── layout/                   # App layout (sidebar, nav)
│   ├── search/                   # Global search (Ctrl+K)
│   ├── reports/                  # Analytics charts
│   └── accessibility/            # Accessibility toolbar
├── lib/
│   ├── supabase/                 # Supabase client configuration
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client + auth helpers
│   │   └── middleware.ts         # Session refresh middleware
│   ├── hooks/                    # Custom React hooks
│   ├── i18n/                     # Internationalization (HE/EN)
│   ├── types.ts                  # TypeScript interfaces
│   ├── utils.ts                  # Utility functions
│   ├── rate-limit.ts             # API rate limiting
│   ├── activity-logger.ts        # Activity tracking
│   ├── error-logger-server.ts    # Server error logging
│   ├── aspect-ratio.ts           # Image dimension utilities
│   ├── platform-specs.ts         # Platform dimension specs
│   └── export-naming.ts          # Smart filename generation
└── middleware.ts                  # Global auth middleware
```

---

## Key Concepts

### Authentication & Authorization

**Auth Flow:**
1. User logs in via email/password (Supabase Auth)
2. Session stored in cookies via `@supabase/ssr`
3. Middleware (`src/middleware.ts`) refreshes session on every request
4. API routes call `getAuthUser()` to verify authentication

**Permission Model:**
```typescript
interface UserPermissions {
  can_view: boolean;
  can_upload: boolean;
  can_delete_assets: boolean;
  can_manage_campaigns: boolean;
  can_manage_users: boolean;
  can_view_activity_log: boolean;
}
```

**Auth Helpers (`lib/supabase/server.ts`):**
- `getAuthUser()` - Get current authenticated user
- `isAdminUser()` - Check admin permission
- `hasPermission(key)` - Check specific permission
- `createServiceRoleClient()` - Bypass RLS for server operations
- `createServerSupabaseClient()` - Client with user's session

### Database Schema

**Core Tables:**
- `workspaces` - Organizations
- `user_profiles` - Users with permissions
- `slugs` - Organizational categories (departments/programs)
- `initiatives` - Marketing campaigns
- `assets` - Files with metadata
- `favorites` - User favorites
- `comments` - Threaded comments
- `collections` - Asset groupings
- `activity_logs` - Audit trail
- `share_links` - Public share tokens
- `upload_tokens` - External upload links
- `saved_searches` - Saved filter configurations
- `approval_rounds` - Approval workflow rounds
- `approval_round_assets` - Assets linked to approval rounds
- `approval_reviewers` - Reviewers with unique tokens
- `approval_comments` - Discussion comments per round

### File Upload System

**Two upload methods:**

1. **Prepare + Direct Upload** (`/api/upload/prepare` + `/api/upload/complete`)
   - Client gets signed URL, uploads directly to Supabase Storage
   - Best for large files, shows upload progress

2. **Server Upload** (`/api/upload`)
   - Server receives file via FormData
   - Handles ZIP extraction (up to 3 levels deep)
   - Best for bulk uploads

**Smart Filename Convention:**
```
{slug}-{campaign|standalone}-{date}-{type}-{ratio}_{dimensions}-{nn}.{ext}
```
Example: `int-openday1832026-20260318-image-1x1_1024x1024-01.png`

**Supported File Types:**
- Images: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC, AVIF
- Video: MP4, MOV, WebM, AVI, MPEG, MKV
- Documents: PDF, DOCX, DOC, TXT, RTF, ODT
- Design: InDesign, AI, EPS, PPTX, HTML
- Links: URL-only assets

---

## API Endpoints Reference

### Assets
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assets` | Required | List assets with filtering |
| GET | `/api/assets/[id]` | Required | Get single asset |
| PATCH | `/api/assets/[id]` | Required | Update asset metadata |
| DELETE | `/api/assets/[id]` | Required | Archive asset |
| GET | `/api/assets/[id]/download` | Required | Download asset |
| GET | `/api/assets/download-zip` | Required | Bulk download as ZIP |
| GET | `/api/assets/counts` | Required | Get faceted filter counts |
| POST | `/api/assets/link` | Required | Create link asset |

### Upload
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | Required | Upload files (supports ZIP) |
| POST | `/api/upload/prepare` | Required | Get signed upload URL |
| POST | `/api/upload/complete` | Required | Finalize upload |

### Campaigns
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/initiatives` | Required | List/create campaigns |
| GET/PATCH/DELETE | `/api/initiatives/[id]` | Required | CRUD campaign |

### Users (Admin Only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/me` | Required | Current user profile |
| POST | `/api/users` | Admin | Invite new user |
| PATCH | `/api/users/[id]` | Admin | Update user |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/tags` | Required | Manage tags |
| GET/POST | `/api/slugs` | Required | Manage slugs |
| GET/POST | `/api/collections` | Required | Manage collections |
| POST/DELETE | `/api/favorites` | Required | Toggle favorites |
| GET/POST | `/api/comments` | Required | Asset comments |
| GET | `/api/activity` | Required | Activity log |
| POST | `/api/shares` | Required | Create share link |
| GET | `/api/shares` | Public | Access shared assets |
| GET | `/api/upload-tokens/[token]/validate` | Public | Validate upload token |

### Approval Workflow
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/approvals` | Required | List my approval rounds |
| POST | `/api/approvals` | Required | Create approval round |
| GET | `/api/approvals/[id]` | Required | Get round details |
| PATCH | `/api/approvals/[id]` | Required | Update round |
| DELETE | `/api/approvals/[id]` | Required | Delete round |
| GET | `/api/approvals/pending` | Required | Rounds pending my approval |
| GET | `/api/approvals/review/[token]` | Public | View round by review token |
| POST | `/api/approvals/review/[token]` | Public | Submit approval/comments |
| POST | `/api/approvals/[id]/comments` | Required | Add comment |
| POST | `/api/approvals/[id]/finalize` | Required | Move approved assets to library |
| POST | `/api/approvals/[id]/assets` | Required | Add assets (new round) |
| POST | `/api/approvals/[id]/reviewers` | Required | Add reviewer |
| DELETE | `/api/approvals/[id]/reviewers` | Required | Remove reviewer |

---

## How to Modify Common Features

### Adding a New Page

1. Create a new directory under `src/app/(authenticated)/`:
```
src/app/(authenticated)/my-page/page.tsx
```

2. The page is automatically protected by the auth layout in `src/app/(authenticated)/layout.tsx`

3. Add navigation entry in `src/components/layout/sidebar.tsx`:
```tsx
{ href: '/my-page', icon: MyIcon, label: 'My Page', heLabel: 'הדף שלי' }
```

### Adding a New API Endpoint

1. Create route file under `src/app/api/`:
```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Your logic here
}
```

2. Always include:
   - Authentication check (`getAuthUser()`)
   - Authorization check if admin-only (`isAdminUser()`)
   - Input validation and sanitization
   - Error logging (`logServerError()`)
   - Activity logging for important actions (`logActivity()`)

### Adding a New Filter to Assets

1. Add the filter parameter handling in `src/app/api/assets/route.ts`
2. Add the filter UI in `src/app/(authenticated)/assets/page.tsx`
3. Add filter count in `src/app/api/assets/counts/route.ts`

### Adding a New File Type

1. Add MIME type to `ALLOWED_MIMES` in `src/app/api/upload/route.ts`
2. Add extension to relevant set (`NEWSLETTER_EXTENSIONS`, `BRIEF_EXTENSIONS`, etc.)
3. Update `getFileType()` function
4. Update the upload page UI text listing supported types

### Adding a New Translation

1. Add keys to `src/lib/i18n/translations.ts`:
```typescript
export const translations = {
  he: { myKey: 'ערך בעברית' },
  en: { myKey: 'English value' },
};
```

2. Use in components:
```tsx
const { t } = useTranslation();
<span>{t('myKey')}</span>
```

### Modifying User Permissions

1. Update the `UserPermissions` interface in `src/lib/types.ts`
2. Add permission check in relevant API route using `hasPermission()`
3. Update the user management UI in `src/app/(authenticated)/settings/page.tsx`

---

## Security Architecture

### Authentication
- Supabase Auth with email/password
- Session cookies managed by `@supabase/ssr`
- Middleware refreshes session on every request
- First user gets admin role; subsequent users get view-only

### Authorization
- **Service Role Client:** Bypasses RLS, used server-side only
- **Server Supabase Client:** Respects RLS, uses user session
- API routes verify workspace membership before allowing access
- Whitelist approach for updateable fields (prevents mass assignment)

### Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Strict-Transport-Security` - Forces HTTPS
- `Content-Security-Policy` - Restricts resource origins
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Disables camera/mic/geo

### Rate Limiting
- In-memory rate limiter on sensitive endpoints
- Upload token validation: 10 req/min per IP
- Share link access: 30 req/min per IP
- Auth rate limiting handled by Supabase

### Input Validation
- File upload: Type whitelist, 50MB size limit
- Query parameters: Sort column allowlist
- Search: Special characters sanitized
- Update fields: Whitelist approach

---

## Deployment

### Vercel (Production)
```bash
# Automatic deployment via GitHub push to main
git push origin main
```

### Environment Setup on Vercel
1. Add all env variables from `.env.local` to Vercel project settings
2. Enable serverless function timeout of 120s for upload routes
3. Configure Supabase project URL in allowed origins

### Database Migrations
SQL migration files are in `supabase/migrations/`. Apply them via:
```bash
supabase db push
# or manually run SQL in Supabase Dashboard > SQL Editor
```

---

## Troubleshooting

### Common Issues

**"Signed URL creation failed: resource already exists"**
- Fixed: Upload filenames now include a unique suffix to prevent collisions
- If it recurs, check that the `stored_filename` generation produces unique names

**"Failed to load upload form data"**
- Check that the `/api/slugs` and `/api/workspaces` endpoints are returning data
- Verify the user has workspace membership

**Build fails with Sharp error**
- Ensure `sharp` is in `serverComponentsExternalPackages` in `next.config.mjs`
- Run `npm install --platform=linux --arch=x64 sharp` for Linux deployment

**Session expires unexpectedly**
- Check that `middleware.ts` is properly refreshing cookies
- Verify Supabase project JWT expiry settings

---

## Code Conventions

- **Language:** TypeScript strict mode
- **Styling:** Tailwind CSS with custom `ono-*` design tokens
- **Components:** Shadcn/ui pattern (Radix UI + Tailwind)
- **State:** SWR for server state, React hooks for local state
- **API:** REST endpoints in `src/app/api/`
- **i18n:** Hebrew-first, with English toggle
- **Error handling:** Log to activity_logs table via `logServerError()`
- **File naming:** kebab-case for files, PascalCase for components
