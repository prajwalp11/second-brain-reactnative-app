import { useEffect, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_SSO_WEB_CLIENT_ID } from '@/constants/config';

/**
 * Google Sign-In via the native Google Sign-In SDK (@react-native-google-signin/google-signin).
 *
 * This uses the native account picker — no browser, no redirect URI. On Android the sign-in is
 * performed via the app's package name + SHA-1 (the Android OAuth client). The returned id_token
 * carries the WEB client as its audience (because webClientId is passed to configure), which the
 * backend (/auth/google) verifies — so GOOGLE_SSO_WEB_CLIENT_ID must be in the backend's
 * GOOGLE_SSO_CLIENT_ID audience list.
 *
 * Note: this is a native module and only works in a dev/preview/production build (not Expo Go).
 */
export function useGoogleAuth() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configure the SDK once with the web client id (used as the id_token audience).
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_SSO_WEB_CLIENT_ID || undefined,
      scopes: ['openid', 'email', 'profile'],
    });
  }, []);

  const signInWithGoogle = async () => {
    if (!GOOGLE_SSO_WEB_CLIENT_ID) {
      setError('Google sign-in is not configured (missing web client ID).');
      return;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: SignInResponse = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        // User dismissed the account picker — not an error to surface.
        return;
      }

      const token = response.data.idToken;
      if (token) {
        setIdToken(token);
      } else {
        setError('No ID token returned from Google.');
      }
    } catch (e: any) {
      // Map the common, actionable error codes; fall back to a generic message.
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services is not available or needs updating.');
        return;
      }
      setError(e?.message ?? 'Google sign-in failed.');
    }
  };

  return {
    idToken,
    error,
    // Native sign-in is always available to attempt; errors are reported via `error`.
    ready: true,
    signInWithGoogle,
    reset: () => {
      setIdToken(null);
      setError(null);
    },
  };
}
