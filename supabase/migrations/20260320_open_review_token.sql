-- Add open_token column to approval_rounds for open link mode
-- When set, anyone with this token can view and submit reviews
ALTER TABLE approval_rounds
ADD COLUMN IF NOT EXISTS open_token TEXT UNIQUE DEFAULT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_approval_rounds_open_token ON approval_rounds(open_token) WHERE open_token IS NOT NULL;
