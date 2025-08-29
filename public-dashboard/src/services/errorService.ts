// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  timestamp: string;
  retryable: boolean;
}

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

class ErrorService {
  private notifications: ErrorNotification[] = [];
  private listeners: Array<(notification: ErrorNotification) => void> = [];
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };

  // Create error from various sources
  createError(
    error: Error | string | any,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): ApiError {
    const message = typeof error === 'string' ? error : error.message || 'An unknown error occurred';
    const status = error.status || error.statusCode;
    const code = error.code || error.name;

    return {
      message,
      code,
      status,
      details: error.details || error,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryableError(status, code, category),
    };
  }

  // Determine if an error is retryable
  private isRetryableError(status?: number, code?: string, category?: ErrorCategory): boolean {
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.AUTHORIZATION) {
      return false;
    }

    if (status) {
      // Retry on 5xx errors (server errors) and some 4xx errors
      return status >= 500 || status === 429 || status === 408;
    }

    if (code) {
      const retryableCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'];
      return retryableCodes.includes(code);
    }

    return category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT;
  }

  // Retry mechanism with exponential backoff
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.retryConfig.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );

        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Show error notification
  showError(
    title: string,
    message: string,
    duration: number = 5000,
    action?: { label: string; onClick: () => void }
  ): string {
    const notification: ErrorNotification = {
      id: this.generateId(),
      type: 'error',
      title,
      message,
      duration,
      action,
    };

    this.notifications.push(notification);
    this.notifyListeners(notification);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Show success notification
  showSuccess(title: string, message: string, duration: number = 3000): string {
    const notification: ErrorNotification = {
      id: this.generateId(),
      type: 'success',
      title,
      message,
      duration,
    };

    this.notifications.push(notification);
    this.notifyListeners(notification);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Show warning notification
  showWarning(title: string, message: string, duration: number = 4000): string {
    const notification: ErrorNotification = {
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      duration,
    };

    this.notifications.push(notification);
    this.notifyListeners(notification);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Show info notification
  showInfo(title: string, message: string, duration: number = 4000): string {
    const notification: ErrorNotification = {
      id: this.generateId(),
      type: 'info',
      title,
      message,
      duration,
    };

    this.notifications.push(notification);
    this.notifyListeners(notification);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Remove notification
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners({ id, type: 'error', title: '', message: '' }); // Trigger re-render
  }

  // Get all notifications
  getNotifications(): ErrorNotification[] {
    return [...this.notifications];
  }

  // Subscribe to notification changes
  subscribe(listener: (notification: ErrorNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(notification: ErrorNotification): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Generate unique ID
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle API errors
  handleApiError(error: any, context?: string): void {
    const apiError = this.createError(error, ErrorCategory.API);
    
    let title = 'API Error';
    let message = apiError.message;

    // Customize error messages based on status codes
    if (apiError.status) {
      switch (apiError.status) {
        case 400:
          title = 'Invalid Request';
          message = 'The request was invalid. Please check your input and try again.';
          break;
        case 401:
          title = 'Authentication Required';
          message = 'Please log in to continue.';
          break;
        case 403:
          title = 'Access Denied';
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          title = 'Not Found';
          message = 'The requested resource was not found.';
          break;
        case 429:
          title = 'Too Many Requests';
          message = 'Please wait a moment before trying again.';
          break;
        case 500:
          title = 'Server Error';
          message = 'An internal server error occurred. Please try again later.';
          break;
        case 502:
        case 503:
        case 504:
          title = 'Service Unavailable';
          message = 'The service is temporarily unavailable. Please try again later.';
          break;
      }
    }

    // Add context if provided
    if (context) {
      title = `${title} - ${context}`;
    }

    this.showError(title, message);
  }

  // Handle network errors
  handleNetworkError(error: any, context?: string): void {
    const networkError = this.createError(error, ErrorCategory.NETWORK);
    
    const title = 'Network Error';
    let message = 'Unable to connect to the server. Please check your internet connection and try again.';

    if (networkError.code === 'ECONNREFUSED') {
      message = 'The server is not responding. Please try again later.';
    } else if (networkError.code === 'ETIMEDOUT') {
      message = 'The request timed out. Please try again.';
    }

    this.showError(context ? `${title} - ${context}` : title, message);
  }

  // Handle validation errors
  handleValidationError(error: any, context?: string): void {
    const validationError = this.createError(error, ErrorCategory.VALIDATION, ErrorSeverity.LOW);
    
    const title = 'Validation Error';
    const message = validationError.message || 'Please check your input and try again.';

    this.showError(context ? `${title} - ${context}` : title, message);
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners({ id: 'clear', type: 'error', title: '', message: '' });
  }

  // Log error for debugging
  logError(error: any, context?: string): void {
    const errorInfo = this.createError(error);
    console.error(`[${context || 'ErrorService'}]`, {
      ...errorInfo,
      stack: error.stack,
      context,
    });
  }
}

// Export singleton instance
export const errorService = new ErrorService();
export default errorService; 