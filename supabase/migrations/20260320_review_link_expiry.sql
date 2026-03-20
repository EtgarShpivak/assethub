-- Add expires_at column to approval_reviewers for optional link expiry
ALTER TABLE approval_reviewers ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

-- Add index for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_approval_reviewers_expires_at ON approval_reviewers(expires_at) WHERE expires_at IS NOT NULL;
