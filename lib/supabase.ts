import { createClient } from '@supabase/supabase-js';

// Use public vars in browser, fall back to server vars on server
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid hard crash with opaque error; surface clearer message in server logs
  console.error('Missing Supabase env: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or ANON key');
}

// Client for server-side operations (with service role for admin access)
// Use service role for full database access in API routes
// Configuration optimized for serverless/edge functions per Supabase docs
export const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey || supabaseAnonKey!,
  {
    auth: { persistSession: false },
    // Optimize for serverless/edge functions
    db: {
      schema: 'public',
    },
    global: {
      // Add timeout to prevent hanging requests
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // 15 second timeout for server-side requests
          signal: AbortSignal.timeout(15000),
        });
      },
    },
  }
);

// Client for client-side (browser) - uses anon key with row-level security
// Optimized for browser usage
export const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Storage buckets configuration
export const STORAGE_BUCKETS = {
  GALLERY: 'gallery',
  RULES_IMAGES: 'rules-images',
  UPLOADS: 'uploads',
  BOARDLE_IMAGES: 'boardle-images',
  DICE_DESIGNS: 'dice-designs',
  PDFS: 'PDFs', // For game PDF rulebooks
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToStorage(
  bucket: StorageBucket,
  filePath: string,
  file: Buffer | ArrayBuffer,
  contentType?: string
): Promise<{ publicUrl: string; error: null } | { publicUrl: null; error: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: contentType || 'application/octet-stream',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return { publicUrl: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { publicUrl: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Exception uploading to Supabase Storage:', error);
    return { publicUrl: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromStorage(
  bucket: StorageBucket,
  filePath: string
): Promise<{ success: boolean; error: null } | { success: false; error: string }> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception deleting from Supabase Storage:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get the public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Check if a file exists in Supabase Storage
 */
export async function fileExists(
  bucket: StorageBucket,
  filePath: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      });

    if (error || !data || data.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  bucket: StorageBucket,
  filePath: string
): Promise<{ data: any; error: null } | { data: null; error: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
