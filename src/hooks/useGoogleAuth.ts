import { useEffect, useState } from 'react';
import { GOOGLE_SSO_WEB_CLIENT_ID } from '@/constants/config';
import { getGoogleSignin, isGoogleSigninAvailable } from '@/services/googleSignin';

/**
 * Google Sign-In via the native Google Sign-In SDK (@react-native-google-signin/google-signin),
 * resolved lazily so the app still runs in Expo Go (where the native module is absent).
 *
 * Native account picker — no browser, no redirect URI. On Android the sign-in is performed via
 * the app's package + SHA-1 (Android OAuth client). The returned id_token's audience is the WEB
 * client (webClientId), which the backend (/auth/google) verifies — so GOOGLE_SSO_WEB_CLIENT_ID
 * must be in the backend's GOOGLE_SSO_CLIENT_ID audience list.
 *
 * Only works in a dev/preview/production build. In Expo Go, `signInWithGoogle` reports a clear
 * message instead of crashing.
 */
export function useGoogleAuth() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configure the SDK once (only when the native module is present).
  useEffect(() => {
    const mod = getGoogleSignin();
    if (!mod) return;
    mod.GoogleSignin.configure({
      webClientId: GOOGLE_SSO_WEB_CLIENT_ID || undefined,
      scopes: ['openid', 'email', 'profile'],
    });
  }, []);

  const signInWithGoogle = async () => {
    const mod = getGoogleSignin();
    if (!mod) {
      setError('Google sign-in needs a development or production build (not available in Expo Go).');
      return;
    }
    if (!GOOGLE_SSO_WEB_CLIENT_ID) {
      setError('Google sign-in is not configured (missing web client ID).');
      return;
    }
    const { GoogleSignin, statusCodes } = mod;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

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
    // Reflects whether native Google sign-in can run here (false in Expo Go).
    ready: isGoogleSigninAvailable(),
    signInWithGoogle,
    reset: () => {
      setIdToken(null);
      setError(null);
    },
  };
}
