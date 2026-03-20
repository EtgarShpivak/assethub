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
