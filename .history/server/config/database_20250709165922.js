const { createClient } = require('@supabase/supabase-js');
// This ensures your environment variables from the root .env.local file are loaded.
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Service Key is missing from environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;