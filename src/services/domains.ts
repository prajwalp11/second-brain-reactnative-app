import api, { AI_TIMEOUT } from './api';
import { CreateDomainRequest, DomainResponse } from '@/types/domain';
import { ENDPOINTS } from '@/constants/endpoints';
import { PersonalRecordResponse } from '@/types/session';

export interface MilestoneResponse {
  id: string;
  domainId: string;
  label: string;
  metricKey: string;
  targetValue: number;
  currentValue: number | null;
  unit: string;
  progressPercent: number | null;
  status: string;
  deadline: string | null;
}

export async function getDomains(): Promise<DomainResponse[]> {
  const response = await api.get<DomainResponse[]>(ENDPOINTS.DOMAINS.LIST);
  return response.data;
}

export async function createDomain(data: CreateDomainRequest): Promise<DomainResponse> {
  const response = await api.post<DomainResponse>(ENDPOINTS.DOMAINS.CREATE, data, AI_TIMEOUT);
  return response.data;
}

export async function getPRsForDomain(domainId: string): Promise<PersonalRecordResponse[]> {
  const response = await api.get<PersonalRecordResponse[]>(ENDPOINTS.PROGRESS.PRS(domainId));
  return response.data;
}

export async function getMilestonesForDomain(domainId: string): Promise<MilestoneResponse[]> {
  const response = await api.get<MilestoneResponse[]>(ENDPOINTS.MILESTONES.BY_DOMAIN(domainId));
  return response.data;
}

export async function pauseDomain(domainId: string): Promise<void> {
  await api.post(ENDPOINTS.DOMAINS.DETAIL(domainId) + '/pause');
}

export async function resumeDomain(domainId: string): Promise<void> {
  await api.post(ENDPOINTS.DOMAINS.DETAIL(domainId) + '/resume');
}

export async function archiveDomain(domainId: string): Promise<void> {
  await api.post(ENDPOINTS.DOMAINS.DETAIL(domainId) + '/archive');
}
