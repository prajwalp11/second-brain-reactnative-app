import api, { AI_TIMEOUT } from './api';
import { CreateDomainRequest, DomainResponse } from '@/types/domain';
import { ENDPOINTS } from '@/constants/endpoints';

export async function getDomains(): Promise<DomainResponse[]> {
  const response = await api.get<DomainResponse[]>(ENDPOINTS.DOMAINS.LIST);
  return response.data;
}

export async function createDomain(data: CreateDomainRequest): Promise<DomainResponse> {
  const response = await api.post<DomainResponse>(ENDPOINTS.DOMAINS.CREATE, data, AI_TIMEOUT);
  return response.data;
}
