/**
 * App configuration.
 *
 * API_BASE_URL is read from environment variable EXPO_PUBLIC_API_BASE_URL.
 * Set it in .env file or pass it when starting:
 *   EXPO_PUBLIC_API_BASE_URL=https://your-server.com/api npx expo start
 *
 * Falls back to the .env file value or empty string if not set.
 */

const FALLBACK_URL = "https://secondbrainserver.duckdns.org/api";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK_URL;

/**
 * Google SSO OAuth client IDs (all public, not secrets), read from EXPO_PUBLIC_* env.
 *
 * Sign-in uses the native Google Sign-In SDK (@react-native-google-signin/google-signin).
 * GOOGLE_SSO_WEB_CLIENT_ID is passed as the SDK's webClientId, so the returned id_token carries
 * the Web client as its audience — the backend's GOOGLE_SSO_CLIENT_ID audience list must include
 * this Web client ID. On Android the sign-in itself is authorized via the app's package name +
 * SHA-1 (the Android OAuth client); the iOS client id is used on iOS builds.
 */
export const GOOGLE_SSO_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_SSO_WEB_CLIENT_ID || "";

export const GOOGLE_SSO_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_SSO_IOS_CLIENT_ID || "";

export const GOOGLE_SSO_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_SSO_ANDROID_CLIENT_ID || "";
