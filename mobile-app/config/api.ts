/**
 * API Configuration for King Dice Mobile App
 * This file centralizes all API endpoints and configuration
 */

import { Platform } from 'react-native';

// Base URL for the API - change this to your production URL
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, use localhost
// For physical device, set EXPO_PUBLIC_API_URL to your computer's IP (e.g. http://192.168.1.100:3000)
const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://kingdice.gg'; // Production
  }

  // Override for physical device testing (set in .env or app.config.js)
  const override = typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_URL;
  if (override && typeof override === 'string') {
    return override.replace(/\/$/, '');
  }

  // In React Native, detect platform
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:3000';
  } else {
    // Web or other platforms
    return 'http://localhost:3000';
  }
};

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
