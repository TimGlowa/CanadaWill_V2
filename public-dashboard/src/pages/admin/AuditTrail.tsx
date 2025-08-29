import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  EyeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { AuditLogEntry, AuditLogFilter } from '../../types/audit';
import { useAuth } from '../../contexts/AuthContext';

export default function AuditTrail() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock audit data
  useEffect(() => {
    const mockAuditLogs: AuditLogEntry[] = [
      {
        id: '1',
        timestamp: new Date('2025-07-21T20:30:00Z'),
        userId: '1',
        userName: 'Admin User',
        userRole: 'admin',
        action: 'updated',
        resourceType: 'quote',
        resourceId: 'q1',
        resourceName: 'Quote from John Smith',
        changes: [
          {
            field: 'stance',
            fieldDisplayName: 'Political Stance',
            oldValue: 'No Position',
            newValue: 'Pro Canada',
            changeType: 'modified',
          },
          {
            field: 'manuallyVerified',
            fieldDisplayName: 'Manual Verification',
            oldValue: false,
            newValue: true,
            changeType: 'modified',
          },
        ],
        reason: 'Corrected classification after manual review',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      {
        id: '2',
        timestamp: new Date('2025-07-21T19:15:00Z'),
        userId: '2',
        userName: 'Editor User',
        userRole: 'editor',
        action: 'reviewed',
        resourceType: 'quote',
        resourceId: 'q2',
        resourceName: 'Quote from Marie Dubois',
        changes: [
          {
            field: 'reviewStatus',
            fieldDisplayName: 'Review Status',
            oldValue: 'pending',
            newValue: 'approved',
            changeType: 'modified',
          },
        ],
        reason: 'Classification appears accurate based on context',
        ipAddress: '192.168.1.2',
      },
      {
        id: '3',
        timestamp: new Date('2025-07-21T18:45:00Z'),
        userId: '1',
        userName: 'Admin User',
        userRole: 'admin',
        action: 'classified',
        resourceType: 'quote',
        resourceId: 'q3',
        resourceName: 'Quote from Robert Johnson',
        changes: [
          {
            field: 'stance',
            fieldDisplayName: 'Political Stance',
            oldValue: null,
            newValue: 'No Position',
            changeType: 'added',
          },
          {
            field: 'confidence',
            fieldDisplayName: 'Confidence Score',
            oldValue: null,
            newValue: 0.65,
            changeType: 'added',
          },
        ],
        reason: 'Automated AI classification',
        ipAddress: '192.168.1.1',
      },
    ];

    setTimeout(() => {
      setAuditLogs(mockAuditLogs);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUserId = !filter.userId || log.userId === filter.userId;
    const matchesAction = !filter.action || log.action === filter.action;
    const matchesResourceType = !filter.resourceType || log.resourceType === filter.resourceType;
    
    return matchesSearch && matchesUserId && matchesAction && matchesResourceType;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <DocumentTextIcon className="h-5 w-5 text-green-500" />;
      case 'updated': return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'deleted': return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      case 'classified': return <DocumentTextIcon className="h-5 w-5 text-purple-500" />;
      case 'reviewed': return <EyeIcon className="h-5 w-5 text-yellow-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'classified': return 'bg-purple-100 text-purple-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    return value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Audit Trail
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Track all changes and administrative actions in the system
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Export Audit Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search users, actions, or resources..."
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filter.action || ''}
                  onChange={(e) => setFilter({ ...filter, action: e.target.value || undefined })}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="classified">Classified</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
              <div>
                <select
                  value={filter.resourceType || ''}
                  onChange={(e) => setFilter({ ...filter, resourceType: e.target.value || undefined })}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Resources</option>
                  <option value="quote">Quotes</option>
                  <option value="person">People</option>
                  <option value="user">Users</option>
                  <option value="setting">Settings</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm text-gray-700">
              Showing {filteredLogs.length} of {auditLogs.length} audit entries
            </p>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <li key={log.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-500">
                          <UserIcon className="inline h-4 w-4 mr-1" />
                          {log.userName} ({log.userRole})
                        </span>
                        <span className="text-sm text-gray-500">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.action}</span> {log.resourceType} "{log.resourceName}"
                      </p>
                      
                      {log.reason && (
                        <p className="mt-1 text-sm text-gray-600 italic">
                          Reason: {log.reason}
                        </p>
                      )}

                      {/* Changes Summary */}
                      {log.changes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            {log.changes.length} field{log.changes.length !== 1 ? 's' : ''} changed
                          </p>
                          {expandedEntry === log.id ? (
                            <div className="bg-gray-50 rounded-md p-3 text-sm">
                              {log.changes.map((change, index) => (
                                <div key={index} className="mb-2 last:mb-0">
                                  <span className="font-medium text-gray-900">
                                    {change.fieldDisplayName}:
                                  </span>
                                  <div className="ml-4">
                                    <span className="text-red-600">
                                      - {formatValue(change.oldValue)}
                                    </span>
                                    <br />
                                    <span className="text-green-600">
                                      + {formatValue(change.newValue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {log.changes.slice(0, 2).map((change, index) => (
                                <span key={index}>
                                  {change.fieldDisplayName}
                                  {index < Math.min(log.changes.length, 2) - 1 ? ', ' : ''}
                                </span>
                              ))}
                              {log.changes.length > 2 && (
                                <span> and {log.changes.length - 2} more...</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedEntry(expandedEntry === log.id ? null : log.id)}
                    className="ml-4 text-indigo-600 hover:text-indigo-900"
                  >
                    <ChevronDownIcon 
                      className={`h-5 w-5 transition-transform ${
                        expandedEntry === log.id ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          {filteredLogs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No audit entries found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 