import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getGoogleSignin } from '@/services/googleSignin';
import { setOnTokenExpired } from '@/services/api';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check if we have a stored token
  useEffect(() => {
    async function loadToken() {
      const storedToken = await SecureStore.getItemAsync('accessToken');
      if (storedToken) {
        setToken(storedToken);
      }
      setIsLoading(false);
    }
    loadToken();
  }, []);

  const signOut = async () => {
    // Clear the cached Google account too, so the next "Continue with Google" shows the account
    // picker. Guarded: the native module is absent in Expo Go, so this is a no-op there.
    try {
      const mod = getGoogleSignin();
      if (mod) {
        await mod.GoogleSignin.signOut();
      }
    } catch {
      // no-op: not signed in with Google, or SDK unavailable
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setToken(null);
  };

  // Register the API interceptor callback so 401s trigger a proper logout
  useEffect(() => {
    setOnTokenExpired(() => {
      setToken(null);
    });
  }, []);

  const signIn = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    setToken(accessToken);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
