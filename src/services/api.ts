import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Logout callback - set by AuthProvider so interceptor can trigger a proper sign-out
let onTokenExpired: (() => void) | null = null;

export function setOnTokenExpired(callback: () => void) {
  onTokenExpired = callback;
}

// Before every request, attach the JWT token if we have one
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Transparent access-token refresh on 401 ────────────────────────────────
// A bare axios instance (no interceptors) so the refresh call itself can't recurse.
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

// De-dupe concurrent refreshes: the first 401 refreshes; others await the same promise.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) return null;
  try {
    const { data } = await refreshClient.post('/auth/refresh', { refreshToken });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null; // refresh token expired/revoked → caller logs out
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only try to refresh once per request, and never for the refresh endpoint itself.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retried = true;

      // Share a single in-flight refresh across concurrent 401s.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original); // replay the original request with the fresh token
      }

      // Refresh failed — clear tokens and force logout.
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      if (onTokenExpired) {
        onTokenExpired();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Use this for AI-powered endpoints that can take a long time
export const AI_TIMEOUT = { timeout: 0 };
