import { AuditLogEntry, AuditChange } from '../types/audit';
import { useAuth } from '../contexts/AuthContext';

class AuditService {
  private static instance: AuditService;
  private logs: AuditLogEntry[] = [];

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit entry for tracking changes
   */
  async logChange(
    action: AuditLogEntry['action'],
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    resourceName: string,
    changes: AuditChange[],
    reason?: string,
    user?: { id: string; name: string; role: string },
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId: user?.id || 'system',
      userName: user?.name || 'System',
      userRole: user?.role || 'system',
      action,
      resourceType,
      resourceId,
      resourceName,
      changes,
      reason,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    // Store locally (in a real app, this would be sent to the backend)
    this.logs.push(entry);
    
    // Store in localStorage for persistence across sessions
    const storedLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    storedLogs.push(entry);
    localStorage.setItem('audit_logs', JSON.stringify(storedLogs));

    console.log('Audit log entry created:', entry);
  }

  /**
   * Log a quote classification change
   */
  async logQuoteChange(
    quoteId: string,
    quoteName: string,
    oldStance: string,
    newStance: string,
    reason?: string,
    user?: { id: string; name: string; role: string },
  ): Promise<void> {
    const changes: AuditChange[] = [
      {
        field: 'stance',
        fieldDisplayName: 'Political Stance',
        oldValue: oldStance,
        newValue: newStance,
        changeType: 'modified',
      },
      {
        field: 'manuallyVerified',
        fieldDisplayName: 'Manual Verification',
        oldValue: false,
        newValue: true,
        changeType: 'modified',
      },
    ];

    await this.logChange(
      'updated',
      'quote',
      quoteId,
      quoteName,
      changes,
      reason,
      user,
    );
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout',
    userId: string,
    userName: string,
    userRole: string,
    success: boolean = true,
  ): Promise<void> {
    const changes: AuditChange[] = [
      {
        field: 'authStatus',
        fieldDisplayName: 'Authentication Status',
        oldValue: action === 'login' ? 'logged_out' : 'logged_in',
        newValue: action === 'login' ? 'logged_in' : 'logged_out',
        changeType: 'modified',
      },
    ];

    await this.logChange(
      action === 'login' ? 'created' : 'deleted',
      'user',
      userId,
      `${userName} session`,
      changes,
      success ? `Successful ${action}` : `Failed ${action}`,
      { id: userId, name: userName, role: userRole },
    );
  }

  /**
   * Get all audit logs (in a real app, this would fetch from backend)
   */
  async getLogs(): Promise<AuditLogEntry[]> {
    // Load from localStorage
    const storedLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    return storedLogs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  }

  /**
   * Generate a unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address (mock implementation)
   */
  private async getClientIP(): Promise<string> {
    // In a real app, you'd get this from the server or a service
    return '192.168.1.100';
  }

  /**
   * Create audit entry for bulk operations
   */
  async logBulkOperation(
    action: string,
    resourceType: string,
    resourceIds: string[],
    changes: AuditChange[],
    reason?: string,
    user?: { id: string; name: string; role: string },
  ): Promise<void> {
    await this.logChange(
      'updated',
      resourceType as AuditLogEntry['resourceType'],
      resourceIds.join(','),
      `Bulk operation on ${resourceIds.length} ${resourceType}s`,
      changes,
      reason || `Bulk ${action} operation`,
      user,
    );
  }

  /**
   * Clear audit logs (admin only)
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();

// React hook for using audit service
export function useAuditService() {
  const { user } = useAuth();

  const logChange = async (
    action: AuditLogEntry['action'],
    resourceType: AuditLogEntry['resourceType'], 
    resourceId: string,
    resourceName: string,
    changes: AuditChange[],
    reason?: string,
  ) => {
    if (user) {
      await auditService.logChange(
        action,
        resourceType,
        resourceId,
        resourceName,
        changes,
        reason,
        { id: user.id, name: user.name, role: user.role },
      );
    }
  };

  const logQuoteChange = async (
    quoteId: string,
    quoteName: string, 
    oldStance: string,
    newStance: string,
    reason?: string,
  ) => {
    if (user) {
      await auditService.logQuoteChange(
        quoteId,
        quoteName,
        oldStance,
        newStance,
        reason,
        { id: user.id, name: user.name, role: user.role },
      );
    }
  };

  const logAuth = async (action: 'login' | 'logout', success: boolean = true) => {
    if (user) {
      await auditService.logAuth(action, user.id, user.name, user.role, success);
    }
  };

  return {
    logChange,
    logQuoteChange,
    logAuth,
    getLogs: auditService.getLogs.bind(auditService),
  };
} 