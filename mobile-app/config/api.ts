/**
 * API Configuration for King Dice Mobile App
 * This file centralizes all API endpoints and configuration
 */

const API_PORT = 3000;

/** Resolve at call time so Expo Go hostUri is available (set after app load). */
export function getApiBaseUrl(): string {
  const override = typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_URL;
  if (override && typeof override === 'string') {
    return override.replace(/\/$/, '');
  }
  // In Expo Go / dev, use same host as Metro so physical devices reach your PC's Next.js server
  try {
    const Constants = require('expo-constants').default;
    const hostUri =
      (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
      (Constants.manifest as { hostUri?: string; debuggerHost?: string } | null)?.hostUri ??
      (Constants.manifest as { hostUri?: string; debuggerHost?: string } | null)?.debuggerHost;
    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];
      if (host) return `http://${host}:${API_PORT}`;
    }
  } catch (_) {}
  return 'https://kingdice.gg';
}

/** Use getApiBaseUrl() when making requests so dev host is resolved at request time. */
export const API_BASE_URL = getApiBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_2FA: '/api/auth/verify-2fa-code',
    VERIFY_EMAIL: '/api/auth/verify-email',
  },
  
  // User
  USER: {
    PROFILE: (username: string) => `/api/users/profile?username=${username}`,
    UPDATE_PROFILE: '/api/users/update-profile',
    COLLECTION: (username: string) => `/api/users/collection?username=${username}`,
    STATS: (username: string) => `/api/users/stats?username=${username}`,
  },
  
  // Games
  GAMES: {
    LIST: '/api/games',
    DETAIL: (id: string) => `/api/games/${id}`,
    HOTNESS: '/api/games/hotness',
    MOST_PLAYED: '/api/games/most-played',
    SEARCH: (query: string) => `/api/games?search=${encodeURIComponent(query)}`,
  },
  
  // Gallery
  GALLERY: {
    LIST: '/api/gallery',
    UPLOAD: '/api/gallery/upload',
  },
  
  // Game Night Tracker
  TRACKER: {
    GET: (username: string) => `/api/game-night-tracker?username=${username}`,
    UPDATE: '/api/game-night-tracker',
  },
} as const;

/**
 * Helper function to build full API URLs
 */
export const getApiUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return as-is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${getApiBaseUrl()}/${cleanEndpoint}`;
};

/**
 * Default headers for API requests
 */
export const getDefaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};
