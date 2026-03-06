-- AssetHub V7 Migration
-- Features: Comment threads, PDF text search, activity indexes

-- 1. Comment threads — add parent_comment_id for reply chains
ALTER TABLE asset_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON asset_comments(parent_comment_id);

-- 2. PDF text content for full-text search
ALTER TABLE assets ADD COLUMN IF NOT EXISTS text_content TEXT;
CREATE INDEX IF NOT EXISTS idx_assets_text_content_gin ON assets USING gin(to_tsvector('simple', COALESCE(text_content, '')));

-- 3. Activity log indexes for reports (heat map, monthly reports)
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(user_id, created_at);
