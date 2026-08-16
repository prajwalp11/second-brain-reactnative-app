import api from './api';
import { ENDPOINTS } from '@/constants/endpoints';
import {
  CreateSessionLogRequest,
  SessionLogResponse,
  MetricDefinitionResponse,
} from '@/types/session';

export async function getMetricsForDomain(domainId: string): Promise<MetricDefinitionResponse[]> {
  const response = await api.get<MetricDefinitionResponse[]>(ENDPOINTS.METRICS.BY_DOMAIN(domainId));
  return response.data;
}

export async function createSessionLog(data: CreateSessionLogRequest): Promise<SessionLogResponse> {
  const response = await api.post<SessionLogResponse>(ENDPOINTS.SESSIONS.CREATE, data);
  return response.data;
}
