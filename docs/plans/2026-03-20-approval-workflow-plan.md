# Approval Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete approval workflow system where brand managers upload draft assets, send review links to approvers, collect feedback, iterate, and finalize approved assets into the production library.

**Architecture:** New DB tables (approval_rounds, approval_round_assets, approval_reviewers, approval_comments) with REST API routes following existing patterns. Mobile-first public review page at `/approve/[token]`. Two authenticated pages: "My Approvals" and "Pending My Approval" in sidebar.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Storage), TypeScript, Tailwind CSS, React

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260320_approval_workflow.sql`

**Step 1: Write the migration SQL**

```sql
-- Approval Workflow Tables
-- Migration: 20260320_approval_workflow.sql

-- 1. Approval Rounds
CREATE TABLE IF NOT EXISTS approval_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','changes_requested','cancelled')),
  current_round_number INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_rounds_workspace ON approval_rounds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_rounds_created_by ON approval_rounds(created_by);
CREATE INDEX IF NOT EXISTS idx_approval_rounds_status ON approval_rounds(status);

-- 2. Assets in each round
CREATE TABLE IF NOT EXISTS approval_round_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  round_number INT NOT NULL DEFAULT 1,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_round_assets_round ON approval_round_assets(round_id);

-- 3. Reviewers
CREATE TABLE IF NOT EXISTS approval_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  display_name TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','changes_requested')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_reviewers_round ON approval_reviewers(round_id);
CREATE INDEX IF NOT EXISTS idx_approval_reviewers_token ON approval_reviewers(token);
CREATE INDEX IF NOT EXISTS idx_approval_reviewers_user ON approval_reviewers(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_reviewers_email ON approval_reviewers(email);

-- 4. Discussion comments
CREATE TABLE IF NOT EXISTS approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES approval_rounds(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES approval_reviewers(id),
  user_id UUID,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_comments_round ON approval_comments(round_id, round_number);

-- RLS Policies
ALTER TABLE approval_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_round_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_comments ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API routes use service role client)
CREATE POLICY "Service role full access" ON approval_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval_round_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval_reviewers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval_comments FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: Apply migration**

Run this SQL in Supabase Dashboard > SQL Editor, or via `supabase db push`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260320_approval_workflow.sql
git commit -m "feat(db): add approval workflow tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts` (add at end of file)

**Step 1: Add approval types**

Add these interfaces at the end of `src/lib/types.ts`:

```typescript
// --- Approval Workflow ---

export interface ApprovalRound {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'approved' | 'changes_requested' | 'cancelled';
  current_round_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  assets?: ApprovalRoundAsset[];
  reviewers?: ApprovalReviewer[];
  comments?: ApprovalComment[];
  creator_name?: string;
}

export interface ApprovalRoundAsset {
  id: string;
  round_id: string;
  asset_id: string;
  round_number: number;
  added_at: string;
  asset?: Asset;
}

export interface ApprovalReviewer {
  id: string;
  round_id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  token: string;
  status: 'pending' | 'approved' | 'changes_requested';
  responded_at: string | null;
  created_at: string;
}

export interface ApprovalComment {
  id: string;
  round_id: string;
  reviewer_id: string | null;
  user_id: string | null;
  author_name: string;
  content: string;
  round_number: number;
  created_at: string;
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add approval workflow interfaces"
```

---

## Task 3: i18n Translations

**Files:**
- Modify: `src/lib/i18n/translations.ts`

**Step 1: Add Hebrew + English translation keys**

Add to the `he` section:
```typescript
// Approvals
'nav.approvals': 'אישורים',
'nav.myApprovals': 'האישורים שלי',
'nav.pendingMyApproval': 'ממתינים לאישורי',
'approval.title': 'סבב אישור',
'approval.create': 'שלח לאישור',
'approval.status.pending': 'ממתין',
'approval.status.approved': 'מאושר',
'approval.status.changes_requested': 'יש הערות',
'approval.status.cancelled': 'בוטל',
'approval.approve': 'מאושר',
'approval.hasComments': 'יש לי הערות',
'approval.addComment': 'הוסף הערה...',
'approval.moveToLibrary': 'העבר לספריה',
'approval.newRound': 'סבב חדש',
'approval.roundN': 'סבב',
'approval.reviewers': 'מאשרים',
'approval.addReviewer': 'הוסף מאשר',
'approval.enterName': 'הזן את שמך',
'approval.noApprovals': 'אין סבבי אישור',
'approval.allApproved': 'כולם אישרו!',
'approval.waitingFor': 'ממתין ל',
'approval.sentBy': 'נשלח ע"י',
'approval.finalize': 'העבר לספרייה',
'approval.finalizeConfirm': 'להעביר את החומרים לספריית החומרים?',
'approval.changeResponse': 'שנה תגובה',
'approval.summary': 'חומרים',
```

Add to the `en` section:
```typescript
'nav.approvals': 'Approvals',
'nav.myApprovals': 'My Approvals',
'nav.pendingMyApproval': 'Pending My Approval',
'approval.title': 'Approval Round',
'approval.create': 'Send for Approval',
'approval.status.pending': 'Pending',
'approval.status.approved': 'Approved',
'approval.status.changes_requested': 'Has Comments',
'approval.status.cancelled': 'Cancelled',
'approval.approve': 'Approved',
'approval.hasComments': 'I Have Comments',
'approval.addComment': 'Add comment...',
'approval.moveToLibrary': 'Move to Library',
'approval.newRound': 'New Round',
'approval.roundN': 'Round',
'approval.reviewers': 'Reviewers',
'approval.addReviewer': 'Add Reviewer',
'approval.enterName': 'Enter your name',
'approval.noApprovals': 'No approval rounds',
'approval.allApproved': 'All approved!',
'approval.waitingFor': 'Waiting for',
'approval.sentBy': 'Sent by',
'approval.finalize': 'Move to Library',
'approval.finalizeConfirm': 'Move assets to the production library?',
'approval.changeResponse': 'Change Response',
'approval.summary': 'Assets',
```

**Step 2: Commit**

```bash
git add src/lib/i18n/translations.ts
git commit -m "feat(i18n): add approval workflow translations"
```

---

## Task 4: API — Core CRUD Routes

**Files:**
- Create: `src/app/api/approvals/route.ts`

**Step 1: Implement GET (list my approvals) and POST (create)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

// List approval rounds created by current user
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_round_assets(id, asset_id, round_number)
    `)
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rounds: data || [] });
}

// Create a new approval round
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { title, description, workspace_id, asset_ids, reviewers } = body as {
    title: string;
    description?: string;
    workspace_id: string;
    asset_ids: string[];
    reviewers: { email: string; display_name?: string }[];
  };

  if (!title || !workspace_id || !asset_ids?.length || !reviewers?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create the round
  const { data: round, error: roundError } = await supabase
    .from('approval_rounds')
    .insert({
      workspace_id,
      title,
      description: description || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (roundError) return NextResponse.json({ error: roundError.message }, { status: 500 });

  // Add assets
  const assetRows = asset_ids.map(aid => ({
    round_id: round.id,
    asset_id: aid,
    round_number: 1,
  }));
  await supabase.from('approval_round_assets').insert(assetRows);

  // Mark assets as draft
  await supabase
    .from('assets')
    .update({ asset_type: 'draft' })
    .in('id', asset_ids);

  // Add reviewers with unique tokens; auto-match internal users
  const reviewerRows = [];
  for (const r of reviewers) {
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .eq('email', r.email)
      .single();

    reviewerRows.push({
      round_id: round.id,
      email: r.email,
      display_name: r.display_name || existingUser?.display_name || null,
      user_id: existingUser?.id || null,
      token: generateToken(),
    });
  }
  const { data: savedReviewers } = await supabase
    .from('approval_reviewers')
    .insert(reviewerRows)
    .select();

  // Log activity
  await logActivity(request, {
    action: 'create',
    entityType: 'approval',
    entityId: round.id,
    entityName: title,
    userId: user.id,
    workspaceId: workspace_id,
    metadata: { asset_count: asset_ids.length, reviewer_count: reviewers.length },
  });

  return NextResponse.json({
    round,
    reviewers: savedReviewers,
    review_links: savedReviewers?.map(r => ({
      email: r.email,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app'}/approve/${r.token}`,
    })),
  }, { status: 201 });
}
```

**Step 2: Commit**

```bash
git add src/app/api/approvals/route.ts
git commit -m "feat(api): approval rounds list and create"
```

---

## Task 5: API — Single Round Operations

**Files:**
- Create: `src/app/api/approvals/[id]/route.ts`

**Step 1: Implement GET, PATCH, DELETE for single round**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Get full approval round details
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: round, error } = await supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_round_assets(
        id, asset_id, round_number, added_at,
        assets(id, original_filename, stored_filename, file_type, mime_type,
               file_size_label, width_px, height_px, dimensions_label,
               aspect_ratio, drive_view_url, domain_context, platforms, tags)
      ),
      approval_reviewers(id, email, display_name, user_id, token, status, responded_at),
      approval_comments(id, author_name, content, round_number, created_at, reviewer_id, user_id)
    `)
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Verify access: creator or reviewer
  const isCreator = round.created_by === user.id;
  const isReviewer = round.approval_reviewers?.some(
    (r: { user_id: string | null }) => r.user_id === user.id
  );
  if (!isCreator && !isReviewer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get creator name
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', round.created_by)
    .single();

  return NextResponse.json({
    ...round,
    creator_name: creator?.display_name || 'Unknown',
  });
}

// Update round (title, description, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  // Verify ownership
  const { data: existing } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ALLOWED = new Set(['title', 'description', 'status']);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(body)) {
    if (ALLOWED.has(key)) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('approval_rounds')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Delete round
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('approval_rounds')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/approvals/[id]/route.ts
git commit -m "feat(api): single approval round CRUD"
```

---

## Task 6: API — Pending My Approval

**Files:**
- Create: `src/app/api/approvals/pending/route.ts`

**Step 1: Implement GET for rounds assigned to current user**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Find rounds where this user is a reviewer
  const { data: myReviews } = await supabase
    .from('approval_reviewers')
    .select('round_id, status, token')
    .eq('user_id', user.id);

  if (!myReviews?.length) {
    return NextResponse.json({ rounds: [] });
  }

  const roundIds = myReviews.map(r => r.round_id);

  const { data: rounds, error } = await supabase
    .from('approval_rounds')
    .select(`
      *,
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_round_assets(id, asset_id, round_number)
    `)
    .in('id', roundIds)
    .in('status', ['pending', 'changes_requested'])
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Annotate each round with current user's review status
  const annotated = (rounds || []).map(round => ({
    ...round,
    my_status: myReviews.find(r => r.round_id === round.id)?.status || 'pending',
    my_token: myReviews.find(r => r.round_id === round.id)?.token,
  }));

  return NextResponse.json({ rounds: annotated });
}
```

**Step 2: Commit**

```bash
git add src/app/api/approvals/pending/route.ts
git commit -m "feat(api): pending my approval endpoint"
```

---

## Task 7: API — Public Review Endpoint (Token-Based)

**Files:**
- Create: `src/app/api/approvals/review/[token]/route.ts`

**Step 1: Implement GET (view) and POST (respond) for token-based review**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public: view approval round by reviewer token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`approval-review:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  // Find reviewer by token
  const { data: reviewer, error: revErr } = await supabase
    .from('approval_reviewers')
    .select('*')
    .eq('token', params.token)
    .single();

  if (revErr || !reviewer) {
    return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });
  }

  // Get the full round with assets, reviewers, comments
  const { data: round } = await supabase
    .from('approval_rounds')
    .select(`
      id, title, description, status, current_round_number, created_by, created_at,
      approval_round_assets(
        id, asset_id, round_number, added_at,
        assets(id, original_filename, stored_filename, file_type, mime_type,
               file_size_label, width_px, height_px, dimensions_label,
               drive_view_url, domain_context)
      ),
      approval_reviewers(id, email, display_name, status, responded_at),
      approval_comments(id, author_name, content, round_number, created_at)
    `)
    .eq('id', reviewer.round_id)
    .single();

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  // Get creator name
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', round.created_by)
    .single();

  return NextResponse.json({
    round: {
      ...round,
      creator_name: creator?.display_name || 'Unknown',
    },
    my_reviewer_id: reviewer.id,
    my_status: reviewer.status,
    my_display_name: reviewer.display_name,
  });
}

// Public: submit approval/comments
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`approval-respond:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServiceRoleClient();

  const { data: reviewer } = await supabase
    .from('approval_reviewers')
    .select('*')
    .eq('token', params.token)
    .single();

  if (!reviewer) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });

  const body = await request.json();
  const { action, comment, display_name } = body as {
    action: 'approved' | 'changes_requested';
    comment?: string;
    display_name?: string;
  };

  if (!action || !['approved', 'changes_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update reviewer name if provided (external user first time)
  const nameToUse = display_name || reviewer.display_name || reviewer.email.split('@')[0];

  // Update reviewer status
  await supabase
    .from('approval_reviewers')
    .update({
      status: action,
      display_name: nameToUse,
      responded_at: new Date().toISOString(),
    })
    .eq('id', reviewer.id);

  // Add comment if provided
  if (comment?.trim()) {
    const { data: round } = await supabase
      .from('approval_rounds')
      .select('current_round_number')
      .eq('id', reviewer.round_id)
      .single();

    await supabase.from('approval_comments').insert({
      round_id: reviewer.round_id,
      reviewer_id: reviewer.id,
      user_id: reviewer.user_id || null,
      author_name: nameToUse,
      content: comment.trim(),
      round_number: round?.current_round_number || 1,
    });
  }

  // Check if all reviewers approved -> update round status
  const { data: allReviewers } = await supabase
    .from('approval_reviewers')
    .select('status')
    .eq('round_id', reviewer.round_id);

  const allApproved = allReviewers?.every(r => r.status === 'approved');
  const anyChanges = allReviewers?.some(r => r.status === 'changes_requested');

  const newRoundStatus = allApproved ? 'approved' : anyChanges ? 'changes_requested' : 'pending';

  await supabase
    .from('approval_rounds')
    .update({ status: newRoundStatus, updated_at: new Date().toISOString() })
    .eq('id', reviewer.round_id);

  return NextResponse.json({ success: true, round_status: newRoundStatus });
}
```

**Step 2: Commit**

```bash
git add src/app/api/approvals/review/[token]/route.ts
git commit -m "feat(api): public approval review endpoint with rate limiting"
```

---

## Task 8: API — Comments and Finalize

**Files:**
- Create: `src/app/api/approvals/[id]/comments/route.ts`
- Create: `src/app/api/approvals/[id]/finalize/route.ts`
- Create: `src/app/api/approvals/[id]/assets/route.ts`
- Create: `src/app/api/approvals/[id]/reviewers/route.ts`

**Step 1: Comments route**

```typescript
// src/app/api/approvals/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('current_round_number')
    .eq('id', params.id)
    .single();

  const { data: comment, error } = await supabase
    .from('approval_comments')
    .insert({
      round_id: params.id,
      user_id: user.id,
      author_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
      content: body.content,
      round_number: round?.current_round_number || 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(comment, { status: 201 });
}
```

**Step 2: Finalize route**

```typescript
// src/app/api/approvals/[id]/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Verify ownership and all-approved status
  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by, status, workspace_id, title')
    .eq('id', params.id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (round.status !== 'approved') {
    return NextResponse.json({ error: 'Round not fully approved yet' }, { status: 400 });
  }

  // Get all asset IDs in this round
  const { data: roundAssets } = await supabase
    .from('approval_round_assets')
    .select('asset_id')
    .eq('round_id', params.id);

  const assetIds = roundAssets?.map(ra => ra.asset_id) || [];

  // Move assets from draft to production
  await supabase
    .from('assets')
    .update({ asset_type: 'production' })
    .in('id', assetIds);

  // Log activity
  await logActivity(request, {
    action: 'edit',
    entityType: 'approval',
    entityId: params.id,
    entityName: round.title,
    userId: user.id,
    workspaceId: round.workspace_id,
    metadata: { action: 'finalize', asset_count: assetIds.length },
  });

  return NextResponse.json({ success: true, finalized_count: assetIds.length });
}
```

**Step 3: Add assets (new round) route**

```typescript
// src/app/api/approvals/[id]/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();
  const { asset_ids } = body as { asset_ids: string[] };

  // Verify ownership
  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by, current_round_number')
    .eq('id', params.id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const newRoundNumber = round.current_round_number + 1;

  // Add new assets
  const rows = asset_ids.map(aid => ({
    round_id: params.id,
    asset_id: aid,
    round_number: newRoundNumber,
  }));
  await supabase.from('approval_round_assets').insert(rows);

  // Update round number and reset to pending
  await supabase
    .from('approval_rounds')
    .update({
      current_round_number: newRoundNumber,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  // Reset all reviewers to pending
  await supabase
    .from('approval_reviewers')
    .update({ status: 'pending', responded_at: null })
    .eq('round_id', params.id);

  return NextResponse.json({ round_number: newRoundNumber });
}
```

**Step 4: Reviewers management route**

```typescript
// src/app/api/approvals/[id]/reviewers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

// Add reviewer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, display_name } = body;

  // Check if already a reviewer
  const { data: existing } = await supabase
    .from('approval_reviewers')
    .select('id')
    .eq('round_id', params.id)
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Reviewer already added' }, { status: 409 });
  }

  // Auto-match internal users
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .eq('email', email)
    .single();

  const { data: reviewer, error } = await supabase
    .from('approval_reviewers')
    .insert({
      round_id: params.id,
      email,
      display_name: display_name || existingUser?.display_name || null,
      user_id: existingUser?.id || null,
      token: generateToken(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reviewer,
    review_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assethub-seven.vercel.app'}/approve/${reviewer.token}`,
  }, { status: 201 });
}

// Remove reviewer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();

  const { data: round } = await supabase
    .from('approval_rounds')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (!round || round.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reviewerId = searchParams.get('reviewer_id');
  if (!reviewerId) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 });

  await supabase
    .from('approval_reviewers')
    .delete()
    .eq('id', reviewerId)
    .eq('round_id', params.id);

  return NextResponse.json({ success: true });
}
```

**Step 5: Commit**

```bash
git add src/app/api/approvals/[id]/
git commit -m "feat(api): approval comments, finalize, assets, and reviewers routes"
```

---

## Task 9: Sidebar Navigation Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add approval entries to nav config**

Import `ClipboardCheck` from lucide-react, then add the approvals group between Upload and System Management:

```typescript
{ href: '/upload', labelKey: 'nav.upload', icon: Upload },
// ADD THIS GROUP:
{
  labelKey: 'nav.approvals',
  icon: ClipboardCheck,
  children: [
    { href: '/approvals', labelKey: 'nav.myApprovals', icon: ClipboardCheck },
    { href: '/approvals/pending', labelKey: 'nav.pendingMyApproval', icon: ClipboardCheck },
  ],
},
// EXISTING:
{
  labelKey: 'nav.systemManagement',
  ...
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(nav): add approvals section to sidebar"
```

---

## Task 10: "My Approvals" Page

**Files:**
- Create: `src/app/(authenticated)/approvals/page.tsx`

**Step 1: Build the My Approvals list page**

Full client component with:
- Fetch from `/api/approvals`
- Status filter tabs: All | Pending | Approved | Has Comments | Cancelled
- Cards showing: title, status badge, reviewer avatars with status, asset count, last activity
- "Create Approval" button → opens modal
- Create modal: title, description, asset selection (search + checkbox), reviewer emails with autocomplete

(Full implementation ~250 lines — see design doc for specifications)

**Step 2: Commit**

```bash
git add src/app/(authenticated)/approvals/page.tsx
git commit -m "feat(ui): My Approvals list page"
```

---

## Task 11: "Pending My Approval" Page

**Files:**
- Create: `src/app/(authenticated)/approvals/pending/page.tsx`

**Step 1: Build pending approval list**

Client component fetching from `/api/approvals/pending`. Shows rounds needing user's review with quick-approve action.

**Step 2: Commit**

```bash
git add src/app/(authenticated)/approvals/pending/page.tsx
git commit -m "feat(ui): Pending My Approval page"
```

---

## Task 12: Public Approval Review Page (Mobile-First)

**Files:**
- Create: `src/app/approve/[token]/page.tsx`

**Step 1: Build mobile-first public review page**

This is the MOST IMPORTANT page. Features:
- No auth required (token-based)
- Mobile-first responsive layout
- Asset carousel with swipe + fullscreen + pinch-to-zoom
- Reviewer status chips
- Comments thread
- Sticky bottom bar: "Has Comments" | "Approved" buttons
- External user name prompt (saved to localStorage)
- Desktop: side-by-side layout

(Full implementation ~400 lines)

**Step 2: Commit**

```bash
git add src/app/approve/[token]/page.tsx
git commit -m "feat(ui): mobile-first public approval review page"
```

---

## Task 13: Create Approval Dialog Component

**Files:**
- Create: `src/components/assets/create-approval-dialog.tsx`

**Step 1: Build reusable dialog for creating approval rounds**

Modal with:
- Title + description inputs
- Reviewer email inputs with autocomplete from user_profiles
- Reviewer group templates (save/load)
- Asset selection from current library
- Submit → calls POST /api/approvals

**Step 2: Integrate into assets page and upload flow**

Add "Send for Approval" button in:
- Asset library toolbar (when assets selected)
- Upload complete page

**Step 3: Commit**

```bash
git add src/components/assets/create-approval-dialog.tsx
git commit -m "feat(ui): create approval dialog component"
```

---

## Task 14: Update Help Page

**Files:**
- Modify: `src/app/(authenticated)/help/page.tsx`

**Step 1: Add approval workflow section to help**

Add a new accordion section explaining:
- How to send assets for approval
- How to review and approve
- How new rounds work
- How to finalize approved assets

**Step 2: Commit**

```bash
git add src/app/(authenticated)/help/page.tsx
git commit -m "docs(help): add approval workflow section"
```

---

## Task 15: Update Developer Guide

**Files:**
- Modify: `DEVELOPER_GUIDE.md`

**Step 1: Add approval workflow API docs**

Add the new endpoints to the API reference table and a section explaining the approval flow.

**Step 2: Commit**

```bash
git add DEVELOPER_GUIDE.md
git commit -m "docs: add approval workflow to developer guide"
```

---

## Task 16: Build & Deploy

**Step 1: Run TypeScript check**
```bash
npx tsc --noEmit
```

**Step 2: Run build**
```bash
npm run build
```

**Step 3: Verify in preview**

Start dev server and manually test:
1. Create approval round from assets page
2. Copy review link, open in incognito (mobile viewport)
3. Submit approval as external reviewer
4. Check comments appear for all parties
5. Finalize when all approved

**Step 4: Push to production**
```bash
git push origin main
```
