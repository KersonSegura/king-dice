/**
 * API Client for King Dice Mobile App
 * Handles all HTTP requests with authentication and error handling
 * Uses React Native's fetch API (compatible with Expo)
 */

import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl, getDefaultHeaders } from '../config/api';

const TOKEN_KEY = 'auth_token';
const TIMEOUT = 30000;

interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  /**
   * Get stored authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Store authentication token
   */
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Clear authentication token
   */
  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  /**
   * Make an HTTP request with fetch
   */
  private async request<T>(
    url: string,
    options: RequestInit = {},
    config?: RequestConfig
  ): Promise<T> {
    const token = await this.getToken();
    const defaultHeaders = getDefaultHeaders(token || undefined);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...config?.headers,
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const base = getApiBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
    const timeout = config?.timeout || TIMEOUT;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      let parsed: any = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
      }

      if (response.status === 401) {
        await this.clearToken();
      }

      if (!response.ok) {
        const errorMessage =
          parsed?.message ||
          response.statusText ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return (parsed ?? ({} as T)) as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { method: 'GET' }, config);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(
      url,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(
      url,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' }, config);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(
      url,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
