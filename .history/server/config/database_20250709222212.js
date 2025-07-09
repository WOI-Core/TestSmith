const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Default client for authenticated requests
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
console.log('✅ Supabase client initialized');

// New, dedicated client for anonymous requests to public buckets
const anonClient = createClient(config.supabase.url, config.supabase.anonKey);
console.log('✅ Supabase anonymous client initialized');

// Export both clients
module.exports = { supabase, anonClient };