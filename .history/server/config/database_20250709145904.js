const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Create the client
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

console.log('✅ Supabase client initialized');

// Export the client directly
module.exports = supabase;