-- ============================================
-- AssetHub Migration — Briefs & Links Support
-- Run in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================

-- 1. Update file_type CHECK constraint to include 'brief' and 'link'
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_file_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_file_type_check
  CHECK (file_type IN ('image','video','pdf','newsletter','brief','link','other'));

-- 2. Add external_url column for link-type assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS external_url TEXT;

-- ============================================
-- Done! Briefs & Links schema ready.
-- ============================================
