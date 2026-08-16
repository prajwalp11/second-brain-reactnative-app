// All API endpoint paths in one place
// These get appended to API_BASE_URL in config.ts

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  DOMAINS: {
    LIST: '/domains',
    CREATE: '/domains',
  },
  DASHBOARD: {
    HOME: '/dashboard',
    WEEKLY_SNAPSHOT: '/dashboard/weekly-snapshot',
  },
  USERS: {
    PROFILE: '/users/profile',
    EXPORT: '/users/export',
  },
  SESSIONS: {
    CREATE: '/session-logs',
    LIST: '/session-logs',
  },
  TASKS: {
    UPDATE_STATUS: (taskId: string) => `/tasks/${taskId}`,
    DELETE: (taskId: string) => `/tasks/${taskId}`,
  },
  METRICS: {
    BY_DOMAIN: (domainId: string) => `/metrics/domain/${domainId}`,
  },
} as const;
