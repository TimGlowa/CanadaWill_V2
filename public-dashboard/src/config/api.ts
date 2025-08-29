// Centralized API configuration
// Reads from environment variables at build time with safe defaults

// API Base URL configuration
const getApiBaseUrl = (): string => {
  // Try to get from Vite environment variable
  const viteApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (viteApiUrl) {
    return viteApiUrl;
  }

  // Fallback to React environment variable (for compatibility)
  const reactApiUrl = process.env.REACT_APP_API_BASE_URL;
  if (reactApiUrl) {
    return reactApiUrl;
  }

  // Safe local default for development
  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api/v1';
  }

  // Production default
  return 'https://canadawill-api2.azurewebsites.net/api/v1';
};

// Export the centralized API base URL
export const apiBaseUrl = getApiBaseUrl();

// Environment information
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Log API configuration in development
if (isDevelopment) {
  console.log('🔧 API Configuration:');
  console.log(`   Base URL: ${apiBaseUrl}`);
  console.log(`   Environment: ${isDevelopment ? 'development' : 'production'}`);
  console.log(`   VITE_API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'not set'}`);
} 