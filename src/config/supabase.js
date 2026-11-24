const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  console.log('⚡ Connected to Supabase Cloud Database');
} else {
  console.log('ℹ️  Supabase credentials not configured in .env. Running in in-memory mode.');
}

module.exports = supabase;
