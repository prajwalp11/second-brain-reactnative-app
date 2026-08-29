export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface TaskResponse {
  id: string;
  domainId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  progress: number | null;
  aiGenerated: boolean;
  daysRemaining: number | null;
  linkedResourceUrl: string | null;
  linkedResourceTitle: string | null;
}

export interface StreakResponse {
  domainId: string;
  domainName: string;
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
}

export interface WeeklyStatResponse {
  domainId: string;
  domainName: string;
  metricKey: string;
  label: string;
  value: number;
  target: number | null;
  unit: string;
}

export interface AiNudgeResponse {
  id: string;
  message: string;
  nudgeType: string;
  domainId: string;
  domainName: string;
}

export interface DashboardResponse {
  greeting: string;
  date: string;
  todayFocus: TaskResponse[];
  streaks: Record<string, StreakResponse>;
  weeklyStats: WeeklyStatResponse[];
  aiNudge: AiNudgeResponse | null;
  upcomingTasks: TaskResponse[];
}
