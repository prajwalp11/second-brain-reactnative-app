import api from './api';
import { UserResponse, UpdateProfileRequest } from '@/types/user';
import { ENDPOINTS } from '@/constants/endpoints';

export async function getProfile(): Promise<UserResponse> {
  const response = await api.get<UserResponse>(ENDPOINTS.USERS.PROFILE);
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
  const response = await api.patch<UserResponse>(ENDPOINTS.USERS.PROFILE, data);
  return response.data;
}

/**
 * Report the device's IANA timezone to the backend so all per-user date logic (today's tasks,
 * streaks, push windows) uses the user's local day. Reuses the profile endpoint; fail-soft — a
 * failure here must never block login.
 */
export async function reportTimezone(): Promise<void> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      await updateProfile({ timezone: tz });
    }
  } catch {
    // non-critical
  }
}

export async function logout(): Promise<void> {
  await api.post(ENDPOINTS.AUTH.LOGOUT);
}
