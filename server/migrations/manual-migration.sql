-- Manual Migration for Enhanced Submission Evaluation
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS test_results JSONB DEFAULT '[]';

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS total_test_cases INTEGER DEFAULT 0;

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS passed_test_cases INTEGER DEFAULT 0;

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS execution_time DECIMAL(10,3) DEFAULT 0;

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS memory_used INTEGER DEFAULT 0;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN submissions.error_message IS 'Detailed error message for failed submissions';
COMMENT ON COLUMN submissions.test_results IS 'JSON array of detailed test case results';
COMMENT ON COLUMN submissions.total_test_cases IS 'Total number of test cases for the problem';
COMMENT ON COLUMN submissions.passed_test_cases IS 'Number of test cases that passed';
COMMENT ON COLUMN submissions.execution_time IS 'Total execution time in seconds';
COMMENT ON COLUMN submissions.memory_used IS 'Maximum memory usage in KB';

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY ordinal_position; 