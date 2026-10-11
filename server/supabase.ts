import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Initialized client with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
  }
} else {
  console.log('[Supabase] No SUPABASE_URL / keys configured. Operating with local persistent store.');
}

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}
