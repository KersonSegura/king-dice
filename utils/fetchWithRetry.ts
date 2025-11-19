/**
 * Fetches data with automatic retry logic and timeout handling
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param retryConfig - Retry configuration
 * @returns Promise with the response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    retryOn?: (response: Response) => boolean;
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000, // 10 seconds default timeout
    retryOn = (response) => !response.ok && response.status >= 500
  } = retryConfig;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // If response is ok or not retryable, return it
        if (response.ok || !retryOn(response)) {
          return response;
        }

        // If this is the last attempt, return the response anyway
        if (attempt === maxRetries) {
          return response;
        }

        // Log retry attempt
        console.warn(
          `⚠️ Fetch failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
          response.status,
          response.statusText,
          'Retrying...'
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw fetchError;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Log retry attempt
      console.warn(
        `⚠️ Fetch error (attempt ${attempt + 1}/${maxRetries + 1}):`,
        lastError.message,
        'Retrying...'
      );

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Fetches JSON data with automatic retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param retryConfig - Retry configuration
 * @returns Promise with the parsed JSON data
 */
export async function fetchJsonWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  retryConfig?: Parameters<typeof fetchWithRetry>[2]
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryConfig);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

