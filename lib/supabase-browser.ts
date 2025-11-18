import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export async function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;

  try {
    // Try to use public envs if present
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let supabaseUrl = envUrl;
    let supabaseAnonKey = envAnon;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Fetch from server-side public config
      try {
        const res = await fetch('/api/public-config');
        if (!res.ok) {
          throw new Error(`Failed to fetch config: ${res.status}`);
        }
        const json = await res.json();
        supabaseUrl = json.supabaseUrl;
        supabaseAnonKey = json.supabaseAnonKey;
      } catch (fetchError) {
        console.error('Error fetching Supabase config:', fetchError);
        throw new Error('Unable to load Supabase configuration. Please check your environment variables.');
      }
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase URL or anon key');
    }

    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
    return cachedClient;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    throw error;
  }
}


