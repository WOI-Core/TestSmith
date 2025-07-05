-- Database migration script to add timezone support
-- This script safely adds new columns and updates existing data

-- Add created_at column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT (datetime('now', '+7 hours'));

-- Add completed_at column to user_progress table if it doesn't exist  
ALTER TABLE user_progress ADD COLUMN completed_at TEXT DEFAULT (datetime('now', '+7 hours'));

-- Update existing users records that don't have created_at timestamps
UPDATE users 
SET created_at = datetime('now', '+7 hours') 
WHERE created_at IS NULL;

-- Update existing user_progress records that don't have completed_at timestamps
UPDATE user_progress 
SET completed_at = datetime('now', '+7 hours') 
WHERE completed_at IS NULL;

-- Update existing submissions to use Bangkok timezone format (optional)
-- This converts existing UTC timestamps to Bangkok time
UPDATE submissions 
SET timestamp = datetime(timestamp, '+7 hours') 
WHERE timestamp NOT LIKE '%+07:00%' AND timestamp IS NOT NULL;

-- Verify the changes
SELECT 'Users with created_at:' as info, COUNT(*) as count FROM users WHERE created_at IS NOT NULL
UNION ALL
SELECT 'User progress with completed_at:' as info, COUNT(*) as count FROM user_progress WHERE completed_at IS NOT NULL
UNION ALL
SELECT 'Total submissions:' as info, COUNT(*) as count FROM submissions;
