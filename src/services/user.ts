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

export async function logout(): Promise<void> {
  await api.post(ENDPOINTS.AUTH.LOGOUT);
}
