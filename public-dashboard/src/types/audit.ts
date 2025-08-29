export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: 'created' | 'updated' | 'deleted' | 'classified' | 'reviewed';
  resourceType: 'quote' | 'person' | 'classification' | 'user' | 'setting';
  resourceId: string;
  resourceName?: string;
  changes: AuditChange[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;
  fieldDisplayName: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

export interface AuditSummary {
  totalEntries: number;
  todayEntries: number;
  weekEntries: number;
  topUsers: { userId: string; userName: string; count: number }[];
  topActions: { action: string; count: number }[];
  recentActivity: AuditLogEntry[];
} 