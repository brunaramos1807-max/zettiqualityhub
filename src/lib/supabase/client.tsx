import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type AnySupabaseClient = any;

let client: AnySupabaseClient | null = null;

export function createClient(): AnySupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null as AnySupabaseClient;
  }
  client = createSupabaseClient(url, key) as AnySupabaseClient;
  return client;
}
