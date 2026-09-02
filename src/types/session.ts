export interface MetricDefinitionResponse {
  id: string;
  metricKey: string;
  label: string;
  unit: string;
  isTrackedPerSession: boolean;
  isPR: boolean;
  isHigherBetter: boolean;
  minValue: number | null;
  maxValue: number | null;
  displayOrder: number;
}

export type FeelLabel = 'STRONG' | 'OKAY' | 'TIRED' | 'ROUGH';

export interface CreateSessionLogRequest {
  domainId: string;
  sessionType?: string;
  logDate: string; // ISO date string (YYYY-MM-DD)
  durationMinutes?: number;
  feelScore?: number;
  feelLabel?: FeelLabel;
  notes?: string;
  linkedReferenceUrl?: string;
  metrics: Record<string, number>;
}

export interface PersonalRecordResponse {
  domainId: string;
  metricKey: string;
  label: string;
  value: number;
  unit: string;
  achievedAt: string;
  previousValue: number | null;
  delta: number | null;
}

export interface SessionLogResponse {
  id: string;
  domainId: string;
  sessionType: string | null;
  logDate: string;
  durationMinutes: number | null;
  feelScore: number | null;
  feelLabel: FeelLabel | null;
  notes: string | null;
  linkedReferenceUrl: string | null;
  aiInsight: string | null;
  metrics: Record<string, number>;
  newPrs: PersonalRecordResponse[];
}
