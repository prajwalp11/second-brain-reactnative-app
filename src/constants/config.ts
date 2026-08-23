/**
 * App configuration.
 *
 * API_BASE_URL is read from environment variable EXPO_PUBLIC_API_BASE_URL.
 * Set it in .env file or pass it when starting:
 *   EXPO_PUBLIC_API_BASE_URL=https://your-server.com/api npx expo start
 *
 * Falls back to the .env file value or empty string if not set.
 */

const FALLBACK_URL = 'https://rylan-skinless-waltraud.ngrok-free.dev/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK_URL;
