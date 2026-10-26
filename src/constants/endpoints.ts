// All API endpoint paths in one place
// These get appended to API_BASE_URL in config.ts

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    REQUEST_ACCOUNT_DELETION: '/auth/request-account-deletion',
    DELETE_ACCOUNT: '/auth/delete-account',
  },
  DOMAINS: {
    LIST: '/domains',
    CREATE: '/domains',
    DETAIL: (domainId: string) => `/domains/${domainId}`,
    CHART_DATA: (domainId: string) => `/domains/${domainId}/chart-data`,
  },
  DASHBOARD: {
    HOME: '/dashboard',
    WEEKLY_SNAPSHOT: '/dashboard/weekly-snapshot',
  },
  USERS: {
    PROFILE: '/users/profile',
  },
  SESSIONS: {
    CREATE: '/session-logs',
    LIST: '/session-logs',
  },
  TASKS: {
    LIST: '/tasks',
    UPCOMING: '/tasks/upcoming',
    UPDATE_STATUS: (taskId: string) => `/tasks/${taskId}`,
    DELETE: (taskId: string) => `/tasks/${taskId}`,
  },
  METRICS: {
    BY_DOMAIN: (domainId: string) => `/metrics/domain/${domainId}`,
  },
  PROGRESS: {
    METRIC: (domainId: string, metricKey: string) => `/progress/${domainId}/metric/${metricKey}`,
    PRS: (domainId: string) => `/progress/${domainId}/prs`,
  },
  MILESTONES: {
    BY_DOMAIN: (domainId: string) => `/milestones/${domainId}`,
  },
  AI: {
    CHAT: '/ai/chat',
    CONVERSATIONS: '/ai/conversations',
    MESSAGES: (conversationId: string) => `/ai/conversations/${conversationId}/messages`,
    APPLY_ACTION: '/ai/actions/apply',
    REMAINING: '/ai/remaining',
  },
  INSIGHTS: {
    GET: '/insights',
    REFRESH: '/insights/refresh',
  },
} as const;
