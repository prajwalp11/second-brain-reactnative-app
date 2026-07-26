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
