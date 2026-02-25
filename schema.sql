-- ============================================
-- AssetHub Full Schema — Fixed Version
-- ============================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS upload_tokens CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS initiatives CASCADE;
DROP TABLE IF EXISTS slugs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS export_logs CASCADE;

-- Workspaces (clients / businesses)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug_prefix TEXT NOT NULL UNIQUE,
  drive_root_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Slug taxonomy (hierarchical domain areas)
CREATE TABLE slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  drive_folder_id TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Marketing Initiatives
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  slug_id UUID REFERENCES slugs(id),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('active','ongoing','ended','archived')) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  drive_folder_id TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assets (every file in the system)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  slug_id UUID REFERENCES slugs(id) NOT NULL,
  initiative_id UUID REFERENCES initiatives(id),
  original_filename TEXT NOT NULL,
  stored_filename TEXT,
  file_type TEXT CHECK (file_type IN ('image','video','pdf','other')),
  mime_type TEXT,
  file_size_bytes BIGINT,
  file_size_label TEXT,
  width_px INTEGER,
  height_px INTEGER,
  dimensions_label TEXT,
  aspect_ratio TEXT,
  duration_seconds INTEGER,
  domain_context TEXT CHECK (domain_context IN ('social','display','print','branding','internal')),
  platforms TEXT[],
  drive_file_id TEXT,
  drive_view_url TEXT,
  upload_date TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID,
  tags TEXT[],
  is_archived BOOLEAN DEFAULT false,
  notes TEXT
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  role TEXT CHECK (role IN ('admin','initiative_manager','media_buyer')) DEFAULT 'media_buyer',
  workspace_ids UUID[]
);

-- External upload tokens
CREATE TABLE upload_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  slug_id UUID REFERENCES slugs(id),
  initiative_id UUID REFERENCES initiatives(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  is_revoked BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Export logs (for dashboard stats)
CREATE TABLE export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  platform TEXT NOT NULL,
  asset_count INTEGER DEFAULT 0,
  exported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_slug ON assets(slug_id);
CREATE INDEX idx_assets_initiative ON assets(initiative_id);
CREATE INDEX idx_assets_file_type ON assets(file_type);
CREATE INDEX idx_assets_dimensions ON assets(dimensions_label);
CREATE INDEX idx_assets_aspect_ratio ON assets(aspect_ratio);
CREATE INDEX idx_assets_upload_date ON assets(upload_date);
CREATE INDEX idx_assets_platforms ON assets USING GIN(platforms);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_slugs_workspace_slug ON slugs(workspace_id, slug);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE slugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Helper: check if user belongs to a workspace
-- The fix: workspace_ids is UUID[], so we use = ANY(array) syntax

-- WORKSPACES: users see workspaces they belong to
CREATE POLICY "Users see own workspaces" ON workspaces
  FOR SELECT USING (
    id = ANY(
      SELECT unnest(workspace_ids) FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins full access workspaces" ON workspaces
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SLUGS: users see slugs in their workspaces
CREATE POLICY "Users see workspace slugs" ON slugs
  FOR SELECT USING (
    workspace_id = ANY(
      SELECT unnest(workspace_ids) FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins full access slugs" ON slugs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INITIATIVES: users see initiatives in their workspaces
CREATE POLICY "Users see workspace initiatives" ON initiatives
  FOR SELECT USING (
    workspace_id = ANY(
      SELECT unnest(workspace_ids) FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins full access initiatives" ON initiatives
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ASSETS: users see assets in their workspaces
CREATE POLICY "Users see workspace assets" ON assets
  FOR SELECT USING (
    workspace_id = ANY(
      SELECT unnest(workspace_ids) FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins full access assets" ON assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- USER_PROFILES: users see their own profile
CREATE POLICY "Users see own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Admins full access profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- UPLOAD_TOKENS: only admins manage tokens
CREATE POLICY "Admins full access tokens" ON upload_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- EXPORT_LOGS: users see logs for their workspaces
CREATE POLICY "Users see workspace export logs" ON export_logs
  FOR SELECT USING (
    workspace_id = ANY(
      SELECT unnest(workspace_ids) FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins full access export logs" ON export_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Seed: first workspace
-- ============================================
INSERT INTO workspaces (name, slug_prefix) VALUES ('הקריה האקדמית אונו', 'ono');
