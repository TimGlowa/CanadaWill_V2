import { RequestInterceptor, ResponseInterceptor } from './representApi';
import { errorService } from './errorService';

// Authentication interceptor - adds auth token to requests
export const authInterceptor: RequestInterceptor = async (config, url, context) => {
  // TODO: Implement actual token retrieval from auth context
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      },
    };
  }
  
  return config;
};

// Request logging interceptor
export const requestLoggingInterceptor: RequestInterceptor = async (config, url, context) => {
  if (import.meta.env.DEV) {
    console.group(`🚀 API Request: ${config.method || 'GET'} ${url}`);
    console.log('Context:', context);
    console.log('Headers:', config.headers);
    if (config.body) {
      console.log('Body:', config.body);
    }
    console.groupEnd();
  }
  
  return config;
};

// Response logging interceptor
export const responseLoggingInterceptor: ResponseInterceptor = async (response, url, context) => {
  if (import.meta.env.DEV) {
    console.group(`📥 API Response: ${response.status} ${url}`);
    console.log('Context:', context);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Status:', response.status, response.statusText);
    console.groupEnd();
  }
  
  return response;
};

// Error handling interceptor
export const errorHandlingInterceptor: ResponseInterceptor = async (response, url, context) => {
  if (!response.ok) {
    // Log error details in development
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, {
        url,
        context,
        status: response.status,
        statusText: response.statusText,
      });
    }
    
    // Handle specific error cases
    if (response.status === 401) {
      // Unauthorized - redirect to login or refresh token
      console.warn('Unauthorized request detected');
      // TODO: Implement token refresh or redirect to login
    } else if (response.status === 403) {
      // Forbidden - user doesn't have permission
      errorService.showError('Access Denied', 'You do not have permission to perform this action.');
    } else if (response.status === 429) {
      // Rate limited
      errorService.showWarning('Rate Limited', 'Too many requests. Please wait a moment before trying again.');
    }
  }
  
  return response;
};

// Data transformation interceptor
export const dataTransformationInterceptor: ResponseInterceptor = async (response, url, context) => {
  // Clone the response so we can read it multiple times
  const clonedResponse = response.clone();
  
  // Only transform JSON responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const data = await clonedResponse.json();
      
      // Transform the data based on context
      if (context === 'Search Politicians' && data.politicians) {
        // Add metadata to politician data
        data.politicians = data.politicians.map((politician: any) => ({
          ...politician,
          _metadata: {
            fetchedAt: new Date().toISOString(),
            source: 'backend',
            context,
          },
        }));
      }
      
      // Create a new response with transformed data
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error('Data transformation error:', error);
      return response;
    }
  }
  
  return response;
};

// Performance monitoring interceptor
export const performanceInterceptor: RequestInterceptor = async (config, url, context) => {
  // Add performance tracking headers
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Request-Start': Date.now().toString(),
      'X-Request-Context': context || 'unknown',
    },
  };
};

// CORS interceptor for external APIs
export const corsInterceptor: RequestInterceptor = async (config, url, context) => {
  // Add CORS headers for external API requests
  if (url.includes('opennorth.ca') || url.includes('openstreetmap.org')) {
    return {
      ...config,
      mode: 'cors' as RequestMode,
      headers: {
        ...config.headers,
        'Accept': 'application/json',
        'User-Agent': 'CanadaWill-Public-Dashboard/1.0',
      },
    };
  }
  
  return config;
};

// Cache control interceptor
export const cacheControlInterceptor: RequestInterceptor = async (config, url, context) => {
  // Add cache control headers based on request type
  if (context === 'Health Check') {
    // Health checks should not be cached
    return {
      ...config,
      headers: {
        ...config.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    };
  } else if (context === 'Get Politician Stances') {
    // Stance data can be cached for a short time
    return {
      ...config,
      headers: {
        ...config.headers,
        'Cache-Control': 'max-age=300', // 5 minutes
      },
    };
  }
  
  return config;
};

// Default interceptors setup
export const setupDefaultInterceptors = (apiClient: any) => {
  // Add request interceptors
  apiClient.addRequestInterceptor(performanceInterceptor);
  apiClient.addRequestInterceptor(requestLoggingInterceptor);
  apiClient.addRequestInterceptor(corsInterceptor);
  apiClient.addRequestInterceptor(cacheControlInterceptor);
  apiClient.addRequestInterceptor(authInterceptor);
  
  // Add response interceptors
  apiClient.addResponseInterceptor(responseLoggingInterceptor);
  apiClient.addResponseInterceptor(errorHandlingInterceptor);
  apiClient.addResponseInterceptor(dataTransformationInterceptor);
};

// Export all interceptors for individual use
export const interceptors = {
  auth: authInterceptor,
  requestLogging: requestLoggingInterceptor,
  responseLogging: responseLoggingInterceptor,
  errorHandling: errorHandlingInterceptor,
  dataTransformation: dataTransformationInterceptor,
  performance: performanceInterceptor,
  cors: corsInterceptor,
  cacheControl: cacheControlInterceptor,
}; 