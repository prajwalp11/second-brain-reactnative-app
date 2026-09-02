import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput } from 'react-native';
import { AuthProvider, useAuth } from '@/store/auth-context';
import { getDomains } from '@/services/domains';

// Disable OS-level font scaling globally so text renders at a consistent size
// on all devices (prevents text clipping on Android/Samsung with large font settings).
// @ts-expect-error - defaultProps is valid at runtime for RN core Text
Text.defaultProps = Text.defaultProps || {};
// @ts-expect-error
Text.defaultProps.allowFontScaling = false;
// @ts-expect-error
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-expect-error
TextInput.defaultProps.allowFontScaling = false;

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkingDomains, setCheckingDomains] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onSetupScreen = segments[1] === 'setup' || segments[1] === 'setup-review';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup && !onSetupScreen) {
      setCheckingDomains(true);
      getDomains()
        .then((domains) => {
          if (domains.length === 0) {
            router.replace('/(auth)/setup');
          } else {
            router.replace('/(tabs)');
          }
        })
        .catch(() => {
          router.replace('/(auth)/setup');
        })
        .finally(() => setCheckingDomains(false));
    }
  }, [token, isLoading, segments]);

  if (isLoading || checkingDomains) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="log-modal"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="domain-detail"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="add-domain"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
