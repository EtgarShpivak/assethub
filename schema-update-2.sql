-- ============================================
-- AssetHub Schema Update #2 — New Features
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================

-- ============================================
-- 1. Assets table additions
-- ============================================

-- Version control: link to parent asset and version number
ALTER TABLE assets ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Expiry & license management
ALTER TABLE assets ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS license_notes TEXT;

-- Archive date tracking (fixes bug: was using upload_date)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- File hash for duplicate detection
ALTER TABLE assets ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Add newsletter to domain_context check constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_domain_context_check;
ALTER TABLE assets ADD CONSTRAINT assets_domain_context_check
  CHECK (domain_context IN ('social','display','print','branding','internal','newsletter'));

-- Add newsletter to file_type check constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_file_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_file_type_check
  CHECK (file_type IN ('image','video','pdf','newsletter','other'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset ON assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_expires ON assets(expires_at);
CREATE INDEX IF NOT EXISTS idx_assets_file_hash ON assets(file_hash);
CREATE INDEX IF NOT EXISTS idx_assets_archived_at ON assets(archived_at);

-- ============================================
-- 2. Collections (Lightboxes)
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_assets_collection ON collection_assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_assets_asset ON collection_assets(asset_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access collections" ON collections;
CREATE POLICY "Service role full access collections" ON collections FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access collection_assets" ON collection_assets;
CREATE POLICY "Service role full access collection_assets" ON collection_assets FOR ALL USING (true);

-- ============================================
-- 3. Comments on assets
-- ============================================
CREATE TABLE IF NOT EXISTS asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_comments_asset ON asset_comments(asset_id);

ALTER TABLE asset_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access comments" ON asset_comments;
CREATE POLICY "Service role full access comments" ON asset_comments FOR ALL USING (true);

-- ============================================
-- 4. Activity Log / Audit Trail
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access activity" ON activity_log;
CREATE POLICY "Service role full access activity" ON activity_log FOR ALL USING (true);

-- ============================================
-- Done! All schema updates for v2 applied.
-- ============================================
