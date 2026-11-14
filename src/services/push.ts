import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import api from './api';
import { ENDPOINTS } from '@/constants/endpoints';

/**
 * Expo push integration (register on login, unregister on logout, foreground + tap handling).
 *
 * expo-notifications is a native module — require it lazily and guard every call so the app still
 * runs in Expo Go (where push is unsupported) exactly like services/googleSignin.ts does.
 */

let Notifications: typeof import('expo-notifications') | null | undefined;

function getNotifications(): typeof import('expo-notifications') | null {
  if (Notifications !== undefined) return Notifications ?? null;
  // Push doesn't work in Expo Go (SDK 53+); only load in a real dev/prod build.
  if (Constants.appOwnership === 'expo') {
    Notifications = null;
    return null;
  }
  try {
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
  return Notifications ?? null;
}

export function isPushAvailable(): boolean {
  return getNotifications() != null && Device.isDevice;
}

/** Show notifications while the app is foregrounded. Safe to call once at startup. */
export function configureForegroundHandler(): void {
  const N = getNotifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android requires notification channels (must match the server's androidChannel ids). */
async function ensureAndroidChannels(): Promise<void> {
  const N = getNotifications();
  if (!N || Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: N.AndroidImportance.DEFAULT,
  });
  await N.setNotificationChannelAsync('streaks', {
    name: 'Streaks',
    importance: N.AndroidImportance.HIGH,
  });
  await N.setNotificationChannelAsync('insights', {
    name: 'Weekly insights',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/**
 * Request permission, resolve the Expo push token, and register it with the backend.
 * Call AFTER the user is authenticated. No-op if push is unavailable or permission is denied.
 */
export async function registerForPush(): Promise<void> {
  const N = getNotifications();
  if (!N || !Device.isDevice) return;

  try {
    await ensureAndroidChannels();

    const existing = await N.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await N.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoToken = tokenResponse.data;
    if (!expoToken) return;

    await api.post(ENDPOINTS.PUSH.TOKEN, {
      expoToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch (e: any) {
    // Fail-soft: never block the app on push setup.
    console.log('Push registration failed:', e);
  }
}

/** Unregister this device's token (call on logout). */
export async function unregisterForPush(): Promise<void> {
  const N = getNotifications();
  if (!N || !Device.isDevice) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoToken = tokenResponse.data;
    if (expoToken) {
      await api.delete(ENDPOINTS.PUSH.TOKEN, { data: { expoToken } });
    }
  } catch (e) {
    console.log('Push unregister failed:', e);
  }
}

/**
 * Wire tap-to-open deep links. Returns a cleanup fn. `navigate` receives the route string from the
 * notification's data payload (server sends e.g. { route: "/(tabs)" }).
 */
export function addNotificationTapListener(
  navigate: (route: string, params?: Record<string, any>) => void
): () => void {
  const N = getNotifications();
  if (!N) return () => {};
  const sub = N.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { route?: string; [k: string]: any }
      | undefined;
    if (data?.route) {
      const { route, ...params } = data;
      navigate(route, params);
    }
  });
  return () => sub.remove();
}

export interface PushPrefs {
  taskDue: boolean;
  streakAtRisk: boolean;
  weeklyInsight: boolean;
}

/** Update per-type notification toggles. */
export async function updatePushPrefs(prefs: PushPrefs): Promise<void> {
  await api.put(ENDPOINTS.PUSH.PREFS, prefs);
}
