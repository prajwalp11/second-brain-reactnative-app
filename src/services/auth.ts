import api from './api';
import { RegisterRequest, LoginRequest, AuthResponse } from '@/types/auth';
import { ENDPOINTS } from '@/constants/endpoints';

export async function registerUser(data: RegisterRequest): Promise<string> {
  const response = await api.post(ENDPOINTS.AUTH.REGISTER, data);
  return response.data;
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, data);
  return response.data;
}

export async function forgotPassword(email: string): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  return response.data;
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, { email, code, newPassword });
}
