# Approval Workflow Design

**Date:** 2026-03-20
**Status:** Approved
**Author:** Claude + Etgar

## Overview

An approval workflow system enabling brand managers to upload draft assets, send review links to approvers (internal users or external contacts), collect approvals/comments, iterate with new versions, and finalize assets into the production library.

## Core Concept: Approval Round

An **approval round** is an independent entity containing:
- A set of assets (images, videos, files — one or many)
- A requester (brand manager who uploaded)
- Reviewers (internal users or external contacts)
- Discussion thread (comments + per-reviewer approval status)
- Version rounds — uploading revised materials opens a new "round number" within the same discussion

## User Flow

```
Brand manager uploads assets (type: draft)
    |
Creates "approval round" -> selects reviewers (internal + external)
    |
Each reviewer gets a unique link
    |
Reviewer views assets -> marks: Approved | Has Comments
    |
Comments visible to all (all reviewers + requester)
    |
[Optional] Requester uploads new version -> new round in same discussion
    |
When 100% reviewers mark Approved -> "Move to Library" button appears
    |
Requester clicks -> assets move from draft to production in library
```

## Database Schema

### Tables

```sql
-- Approval rounds
CREATE TABLE approval_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','changes_requested','cancelled')),
  current_round_number INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assets in each round
CREATE TABLE approval_round_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  round_number INT NOT NULL DEFAULT 1,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviewers
CREATE TABLE approval_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','changes_requested')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discussion comments
CREATE TABLE approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES approval_reviewers(id),
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes
- `approval_rounds(workspace_id, created_by)`
- `approval_rounds(status)`
- `approval_reviewers(round_id)`
- `approval_reviewers(token)` — UNIQUE
- `approval_reviewers(user_id)` — for "pending my approval" queries
- `approval_comments(round_id, round_number)`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/approvals` | Required | Create new approval round |
| GET | `/api/approvals` | Required | List rounds I created |
| GET | `/api/approvals/pending` | Required | Rounds pending my approval |
| GET | `/api/approvals/[id]` | Required | Get round details |
| PATCH | `/api/approvals/[id]` | Required | Update round (title, cancel) |
| DELETE | `/api/approvals/[id]` | Required | Delete round |
| POST | `/api/approvals/[id]/assets` | Required | Add assets (new round) |
| POST | `/api/approvals/[id]/reviewers` | Required | Add reviewers |
| DELETE | `/api/approvals/[id]/reviewers/[rid]` | Required | Remove reviewer |
| GET | `/api/approvals/review/[token]` | Public+RL | View round by token |
| POST | `/api/approvals/review/[token]` | Public+RL | Submit approval/comments |
| POST | `/api/approvals/[id]/comments` | Req/Token | Add comment |
| POST | `/api/approvals/[id]/finalize` | Required | Move assets to library |

Public endpoints are rate-limited (20 req/min per IP).

## UI Pages

### 1. "My Approvals" Page (`/approvals`)
- Lists all approval rounds created by current user
- Cards showing: title, status badge, reviewer count, latest activity
- Filter by status: All | Pending | Approved | Has Comments | Cancelled
- Action: Create new approval round

### 2. "Pending My Approval" Page (`/approvals/pending`)
- Lists rounds where current user is a reviewer with status=pending
- Badge count in sidebar navigation
- Quick-action: approve directly from list

### 3. Approval Review Page (`/approve/[token]`)
Mobile-first public page (no auth required):

**Mobile layout (stacked):**
- Header: AssetHub branding + round title + sender name
- Asset carousel: swipeable, tap for fullscreen with pinch-to-zoom
- Reviewer status chips: shows who approved/has comments/pending
- Comments thread: scrollable, newest at bottom
- Comment input field
- Sticky bottom bar: "Has Comments" | "Approved" buttons (large, thumb-friendly)

**Desktop layout (side-by-side):**
- Left: large asset preview/gallery
- Right: reviewer status + comments + action buttons

**External reviewer flow:**
- First visit: prompt for display name (stored in localStorage)
- Subsequent visits: name auto-filled
- Internal users (email matches): name auto-populated from user_profiles

### 4. Create Approval Dialog
- Triggered from upload page or assets library
- Select assets (checkboxes in asset grid)
- Add title + optional description
- Add reviewers: email input with autocomplete for existing users
- Submit → generates unique links per reviewer

## Finalization Flow

When all reviewers have status=approved:
1. "Move to Library" button appears on the round detail page
2. Requester clicks → confirmation dialog
3. System updates all round assets: `asset_type` from 'draft' to 'production'
4. Round status changes to 'approved'
5. Activity logged for audit trail

## Navigation

Two new sidebar entries under a new "Approvals" section:
- "My Approvals" — rounds I created (with count badge for pending)
- "Pending My Approval" — rounds I need to review (with count badge)

## Security

- Reviewer tokens: 24-char random string (same pattern as share_links)
- Rate limiting on public endpoints: 20 req/min per IP
- Workspace membership verification on authenticated endpoints
- External reviewers: view + comment + approve only (no file upload/download)
- Activity logging on all state changes

## Activity Logging

New action types: `approval_create`, `approval_approve`, `approval_reject`, `approval_comment`, `approval_finalize`
Entity type: `approval`
