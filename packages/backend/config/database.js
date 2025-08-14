const { createClient } = require('@supabase/supabase-js');

// Load environment variables directly to ensure they're available
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase configuration directly from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required but not found in environment variables');
}
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY is required but not found in environment variables');
}

// Create the client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase client initialized');

// Export the client directly
module.exports = supabase;