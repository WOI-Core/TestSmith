const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_submission_enhancements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL:');
    console.log(migrationSQL);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 New columns added to submissions table:');
    console.log('   - error_message (TEXT)');
    console.log('   - test_results (JSONB)');
    console.log('   - total_test_cases (INTEGER)');
    console.log('   - passed_test_cases (INTEGER)');
    console.log('   - execution_time (DECIMAL)');
    console.log('   - memory_used (INTEGER)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 