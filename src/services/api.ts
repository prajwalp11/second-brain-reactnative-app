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

// If we get a 401, the token is expired/invalid — force logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken');
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
