-- Add timezone support to existing database
-- Run this script to add the missing columns

-- Add completed_at column to user_progress table
ALTER TABLE user_progress ADD COLUMN completed_at TEXT DEFAULT (datetime('now', '+7 hours'));

-- Add created_at column to users table (if it doesn't exist)
ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT (datetime('now', '+7 hours'));

-- Update existing user_progress records with current Bangkok time
UPDATE user_progress 
SET completed_at = datetime('now', '+7 hours') 
WHERE completed_at IS NULL;

-- Update existing users records with current Bangkok time
UPDATE users 
SET created_at = datetime('now', '+7 hours') 
WHERE created_at IS NULL;

-- Show the updated schema
.schema user_progress
.schema users

-- Show some sample data to verify
SELECT 'Sample user_progress records:' as info;
SELECT id, user_id, problem_id, completed_at FROM user_progress LIMIT 5;

SELECT 'Sample users records:' as info;
SELECT id, username, created_at FROM users LIMIT 5;
