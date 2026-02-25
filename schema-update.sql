-- ============================================
-- AssetHub Schema Update — All Features
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================

-- 1. Make initiative slug_id nullable (cross-slug initiatives)
ALTER TABLE initiatives ALTER COLUMN slug_id DROP NOT NULL;

-- 2. Add asset_type column to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type TEXT
  CHECK (asset_type IN ('production', 'source', 'draft'))
  DEFAULT 'production';

-- 3. Add index for asset_type
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);

-- 4. Add index for tags search
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);

-- 5. Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe even if they don't exist)
DROP POLICY IF EXISTS "Users see own searches" ON saved_searches;
DROP POLICY IF EXISTS "Users create own searches" ON saved_searches;
DROP POLICY IF EXISTS "Users update own searches" ON saved_searches;
DROP POLICY IF EXISTS "Users delete own searches" ON saved_searches;
DROP POLICY IF EXISTS "Service role full access searches" ON saved_searches;

-- Recreate policies
CREATE POLICY "Users see own searches" ON saved_searches FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create own searches" ON saved_searches FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own searches" ON saved_searches FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own searches" ON saved_searches FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Service role full access searches" ON saved_searches FOR ALL USING (true);

-- ============================================
-- 6. Share Links table
-- ============================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  asset_ids UUID[] NOT NULL,
  filters JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access shares" ON share_links;
CREATE POLICY "Service role full access shares" ON share_links FOR ALL USING (true);

-- ============================================
-- 7. User Roles & Permissions system
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS view_filters JSONB DEFAULT NULL;

-- Update role check constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- ============================================
-- 8. Ensure super admin for etgar.shpivak@gmail.com
-- ============================================
UPDATE user_profiles
SET role = 'admin',
    permissions = '{"can_upload": true, "can_view": true, "can_manage_initiatives": true}'::jsonb,
    is_active = true
WHERE email = 'etgar.shpivak@gmail.com';

-- ============================================
-- Done! All schema updates applied.
-- ============================================
