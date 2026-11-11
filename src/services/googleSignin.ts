/**
 * Safe accessor for the native Google Sign-In SDK.
 *
 * `@react-native-google-signin/google-signin` is a NATIVE module — it does not exist in Expo Go.
 * Importing it at module top crashes the whole app on startup in Expo Go
 * (`TurboModuleRegistry.getEnforcing('RNGoogleSignin')`). To allow quick UI testing in Expo Go,
 * we:
 *   - detect Expo Go via expo-constants (appOwnership === 'expo'), and
 *   - lazily `require()` the module only when actually needed, guarded in try/catch.
 *
 * In any real build (development / preview / production) the module is present and everything
 * works exactly as normal. No env flag — behavior keys off whether the native module exists.
 */
import Constants from 'expo-constants';

/** True when running inside the Expo Go sandbox (native custom modules unavailable). */
export const isExpoGo = Constants.appOwnership === 'expo';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let cached: GoogleSigninModule | null | undefined;

/**
 * Returns the google-signin module, or null if it isn't available (e.g. Expo Go).
 * Never throws.
 */
export function getGoogleSignin(): GoogleSigninModule | null {
  if (cached !== undefined) return cached;
  if (isExpoGo) {
    cached = null;
    return null;
  }
  try {
    // Lazy require so the native module is only resolved in real builds.
    cached = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether native Google Sign-In is usable in this runtime. */
export function isGoogleSigninAvailable(): boolean {
  return getGoogleSignin() != null;
}
