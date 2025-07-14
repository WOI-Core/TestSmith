-- Migration: Add enhanced submission evaluation columns
-- This migration adds new columns to the submissions table for better evaluation tracking

-- Add new columns to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS test_results JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_test_cases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS passed_test_cases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_time DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS memory_used INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN submissions.error_message IS 'Detailed error message for failed submissions';
COMMENT ON COLUMN submissions.test_results IS 'JSON array of detailed test case results';
COMMENT ON COLUMN submissions.total_test_cases IS 'Total number of test cases for the problem';
COMMENT ON COLUMN submissions.passed_test_cases IS 'Number of test cases that passed';
COMMENT ON COLUMN submissions.execution_time IS 'Total execution time in seconds';
COMMENT ON COLUMN submissions.memory_used IS 'Maximum memory usage in KB';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id); 