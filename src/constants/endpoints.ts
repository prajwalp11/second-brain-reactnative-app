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
} as const;
