export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://canadawill-api2-fberbsa2dhffdmd4.canadacentral-01.azurewebsites.net/api/v1'
  : 'https://canadawill-api2-fberbsa2dhffdmd4.canadacentral-01.azurewebsites.net/api/v1';

// Additional configuration constants
export const APP_CONFIG = {
  name: 'CanadaWill Admin Dashboard',
  version: '1.0.0',
  apiBaseUrl: API_BASE_URL,
  auth: {
    tokenKey: 'canadawill_auth_token',
    refreshTokenKey: 'canadawill_refresh_token',
  },
  endpoints: {
    auth: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
    },
    politicians: '/politicians',
    statements: '/statements',
    news: '/news',
    reports: '/reports',
    import: '/import',
  },
}; 