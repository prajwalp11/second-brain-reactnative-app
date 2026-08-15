import api from './api';
import { DashboardResponse } from '@/types/dashboard';
import { ENDPOINTS } from '@/constants/endpoints';

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>(ENDPOINTS.DASHBOARD.HOME);
  return response.data;
}
