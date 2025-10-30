import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export async function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;

  // Try to use public envs if present
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseUrl = envUrl;
  let supabaseAnonKey = envAnon;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fetch from server-side public config
    const res = await fetch('/api/public-config');
    if (!res.ok) throw new Error('Unable to load Supabase config');
    const json = await res.json();
    supabaseUrl = json.supabaseUrl;
    supabaseAnonKey = json.supabaseAnonKey;
  }

  cachedClient = createClient(supabaseUrl!, supabaseAnonKey!);
  return cachedClient;
}


