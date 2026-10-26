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

/**
 * Fetch past session logs for a domain (most recent first). Backend returns a Spring Page.
 */
export async function getLogsForDomain(domainId: string, page = 0, size = 50): Promise<SessionLogResponse[]> {
  const response = await api.get(ENDPOINTS.SESSIONS.LIST, {
    params: { domainId, page, size },
  });
  // Spring Data Page → items are under `content`
  return (response.data?.content ?? response.data ?? []) as SessionLogResponse[];
}
