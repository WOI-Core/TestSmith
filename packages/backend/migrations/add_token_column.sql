-- Add token column to submissions table for Judge0 integration
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS token TEXT;

-- Add index for token lookup (used in webhooks)
CREATE INDEX IF NOT EXISTS idx_submissions_token ON submissions(token);

-- Add comment for documentation
COMMENT ON COLUMN submissions.token IS 'Judge0 token for tracking submission evaluation progress';