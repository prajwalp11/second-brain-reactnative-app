import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setOnTokenExpired } from '@/services/api';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
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
    await SecureStore.deleteItemAsync('accessToken');
    setToken(null);
  };

  // Register the API interceptor callback so 401s trigger a proper logout
  useEffect(() => {
    setOnTokenExpired(() => {
      setToken(null);
    });
  }, []);

  const signIn = async (newToken: string) => {
    await SecureStore.setItemAsync('accessToken', newToken);
    setToken(newToken);
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
