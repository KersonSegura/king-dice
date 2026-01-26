/**
 * API Configuration for King Dice Mobile App
 * This file centralizes all API endpoints and configuration
 */

// Base URL for the API - change this to your production URL
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000' // Development - adjust if your dev server is different
  : 'https://kingdice.gg'; // Production

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
    DETAIL: (id: string) => `/api/game/${id}`,
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
  return `${API_BASE_URL}/${cleanEndpoint}`;
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
