import { supabaseAdmin } from './supabase';

/**
 * Check if an error response is HTML (like Cloudflare error pages)
 */
function isHtmlError(error: any): boolean {
  if (typeof error === 'string') {
    return error.trim().startsWith('<!DOCTYPE') || error.trim().startsWith('<html');
  }
  if (error?.message && typeof error.message === 'string') {
    return error.message.trim().startsWith('<!DOCTYPE') || error.message.trim().startsWith('<html');
  }
  return false;
}

/**
 * Execute a Supabase query with retry logic and better error handling
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    timeout = 15000
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Supabase query timeout')), timeout);
      });

      // Race between query and timeout
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]);

      // Check if result has an error
      if (result.error) {
        // Check if error is HTML (Cloudflare timeout page)
        if (isHtmlError(result.error)) {
          throw new Error('Database connection timeout. Please try again in a moment.');
        }
        
        // Check if it's a connection error
        if (result.error.message?.includes('timeout') || 
            result.error.message?.includes('ECONNREFUSED') ||
            result.error.message?.includes('ENOTFOUND') ||
            result.error.code === 'PGRST116' ||
            result.error.code === 'PGRST301') {
          // Connection error - retry
          if (attempt < maxRetries) {
            lastError = result.error;
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            continue;
          }
        }
        
        // Non-retryable error
        return result;
      }

      // Success
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if it's a timeout or HTML error
      if (error.message?.includes('timeout') || isHtmlError(error)) {
        if (attempt < maxRetries) {
          console.warn(`⚠️ Supabase query timeout (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        } else {
          return {
            data: null,
            error: {
              message: 'Database connection timeout. The database may be temporarily unavailable. Please try again in a few moments.',
              code: 'TIMEOUT'
            }
          };
        }
      }

      // Other errors - return immediately
      return {
        data: null,
        error: {
          message: error.message || 'Database query failed',
          code: error.code || 'UNKNOWN'
        }
      };
    }
  }

  // If we get here, all retries failed
  return {
    data: null,
    error: {
      message: lastError?.message || 'Database query failed after retries',
      code: 'RETRY_EXHAUSTED'
    }
  };
}

/**
 * Helper to query users table with retry logic
 */
export async function queryUsers<T = any>(
  queryBuilder: (client: typeof supabaseAdmin) => any,
  options?: Parameters<typeof executeSupabaseQuery>[1]
) {
  return executeSupabaseQuery(async () => {
    const query = queryBuilder(supabaseAdmin);
    return await query;
  }, options);
}

