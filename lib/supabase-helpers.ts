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
 * Check if an error is retriable (network/5xx/timeout, not 4xx/RLS)
 */
function isRetriableError(error: any): boolean {
  // HTML error pages (Cloudflare timeouts)
  if (isHtmlError(error)) return true;
  
  // Network errors
  if (error?.name === 'AbortError') return true;
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') return true;
  
  // Supabase PostgREST connection errors
  if (error?.code === 'PGRST116' || error?.code === 'PGRST301') return true;
  
  // Timeout messages
  if (error?.message && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('connection timed out')) return true;
  }
  
  // HTTP 5xx errors (server errors)
  if (error?.status >= 500) return true;
  
  // Don't retry 4xx errors (client errors, RLS, etc.)
  if (error?.status >= 400 && error?.status < 500) return false;
  
  return false;
}

/**
 * Run a promise with a timeout using AbortController
 */
export async function runWithTimeout<T>(
  promise: Promise<T>,
  ms: number = 15000,
  signal?: AbortSignal
): Promise<T> {
  // If already aborted, throw immediately
  if (signal?.aborted) {
    throw new Error('Operation aborted');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  // If external signal aborts, abort our controller too
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Operation timeout after ${ms}ms`));
        });
      })
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Execute a Supabase query with retry logic, jitter, and better error handling
 * Only retries on network/5xx/timeout conditions; does not retry 4xx or RLS errors
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    timeout?: number;
    signal?: AbortSignal;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const {
    maxRetries = 2,
    baseDelay = 400,
    timeout = 15000,
    signal
  } = options;

  // If already aborted, return error immediately
  if (signal?.aborted) {
    return {
      data: null,
      error: {
        message: 'Operation aborted',
        code: 'ABORTED'
      }
    };
  }

  let lastError: any = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Wrap query with timeout
      const result = await runWithTimeout(queryFn(), timeout, signal);

      // Check if result has an error
      if (result.error) {
        // Check if error is HTML (Cloudflare timeout page)
        if (isHtmlError(result.error)) {
          if (attempt < maxRetries && isRetriableError(result.error)) {
            lastError = result.error;
            attempt++;
            // Jittered exponential backoff: baseDelay * 2^attempt + random(0-150ms)
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return {
            data: null,
            error: {
              message: 'Database connection timeout. The database may be temporarily unavailable. Please try again in a few moments.',
              code: 'TIMEOUT'
            }
          };
        }

        // Check if error is retriable
        if (isRetriableError(result.error)) {
          if (attempt < maxRetries) {
            lastError = result.error;
            attempt++;
            // Jittered exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
            console.warn(`⚠️ Supabase query retriable error (attempt ${attempt}/${maxRetries + 1}):`, result.error.message || result.error.code);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // Non-retriable error (4xx, RLS, etc.) - return immediately
        return result;
      }

      // Success
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if aborted
      if (signal?.aborted || error?.message?.includes('aborted')) {
        return {
          data: null,
          error: {
            message: 'Operation aborted',
            code: 'ABORTED'
          }
        };
      }

      // Check if error is retriable
      if (isRetriableError(error)) {
        if (attempt < maxRetries) {
          attempt++;
          // Jittered exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
          console.warn(`⚠️ Supabase query error (attempt ${attempt}/${maxRetries + 1}):`, error.message || error.code);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // All retries exhausted
          return {
            data: null,
            error: {
              message: isHtmlError(error) 
                ? 'Database connection timeout. The database may be temporarily unavailable. Please try again in a few moments.'
                : `Database query failed after ${maxRetries + 1} attempts: ${error.message || 'Unknown error'}`,
              code: error.code || 'RETRY_EXHAUSTED'
            }
          };
        }
      }

      // Non-retriable error - return immediately
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
      code: lastError?.code || 'RETRY_EXHAUSTED'
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
