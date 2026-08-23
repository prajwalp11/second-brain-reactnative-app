import api from './api';
import { ENDPOINTS } from '@/constants/endpoints';
import { TaskResponse, TaskStatus } from '@/types/dashboard';
import { MetricDefinitionResponse, PersonalRecordResponse } from '@/types/session';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ProgressResponse {
  domainId: string;
  metricKey: string;
  timeSeries: TimeSeriesPoint[];
  milestones: MilestoneResponse[];
  prs: PersonalRecordResponse[];
}

export interface MilestoneResponse {
  id: string;
  domainId: string;
  label: string;
  metricKey: string;
  targetValue: number;
  currentValue: number | null;
  unit: string;
  progressPercent: number | null;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'DONE' | 'MISSED';
  deadline: string | null;
  completedAt: string | null;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

/**
 * Fetch time-series chart data for a domain (aggregated metric values per day).
 */
export async function getChartData(domainId: string, days: number = 30): Promise<TimeSeriesPoint[]> {
  const response = await api.get<TimeSeriesPoint[]>(ENDPOINTS.DOMAINS.CHART_DATA(domainId), {
    params: { days },
  });
  return response.data;
}

/**
 * Fetch metric time-series + milestones + PRs for a specific metric in a domain.
 */
export async function getMetricProgress(
  domainId: string,
  metricKey: string,
  from: string,
  to: string,
): Promise<ProgressResponse> {
  const response = await api.get<ProgressResponse>(ENDPOINTS.PROGRESS.METRIC(domainId, metricKey), {
    params: { from, to },
  });
  return response.data;
}

/**
 * Fetch milestones for a domain.
 */
export async function getMilestonesForDomain(domainId: string): Promise<MilestoneResponse[]> {
  const response = await api.get<MilestoneResponse[]>(ENDPOINTS.MILESTONES.BY_DOMAIN(domainId));
  return response.data;
}

/**
 * Fetch tasks with optional filters.
 */
export async function getTasks(params?: {
  status?: TaskStatus;
  domainId?: string;
}): Promise<TaskResponse[]> {
  const response = await api.get<TaskResponse[]>(ENDPOINTS.TASKS.LIST, { params });
  return response.data;
}

/**
 * Fetch metric definitions for a domain (used for metric dropdown).
 */
export async function getMetricsForDomain(domainId: string): Promise<MetricDefinitionResponse[]> {
  const response = await api.get<MetricDefinitionResponse[]>(ENDPOINTS.METRICS.BY_DOMAIN(domainId));
  return response.data;
}
