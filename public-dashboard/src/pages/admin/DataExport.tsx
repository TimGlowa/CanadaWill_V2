import { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  supports: string[];
}

interface ExportJob {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  format: string;
  filters: ExportFilters;
  anonymization: AnonymizationSettings;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  description: string;
  template: ReportTemplate;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
    hour: number; // 0-23
    minute: number; // 0-59
    timezone: string;
  };
  enabled: boolean;
  nextRun: string;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  recipients: string[];
  createdBy: string;
  createdAt: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  format: string;
  filters: ExportFilters;
  fields: string[];
  anonymization: AnonymizationSettings;
  customSql?: string;
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
  isPublic: boolean;
}

interface ExportFilters {
  dateRange?: {
    from: string;
    to: string;
  };
  parties?: string[];
  constituencies?: string[];
  stanceClassifications?: string[];
  verificationStatus?: string[];
  sources?: string[];
  priority?: string[];
  includeUnverified: boolean;
}

interface AnonymizationSettings {
  removePersonalInfo: boolean;
  hashEmails: boolean;
  removePhoneNumbers: boolean;
  removeAddresses: boolean;
  aggregateOnly: boolean;
  customRules?: {
    field: string;
    action: 'remove' | 'hash' | 'mask' | 'aggregate';
  }[];
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV',
    extension: '.csv',
    description: 'Comma-separated values, compatible with Excel and other spreadsheet applications',
    supports: ['politicians', 'quotes', 'emails', 'reports'],
  },
  {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    description: 'JavaScript Object Notation, ideal for API integration and data processing',
    supports: ['politicians', 'quotes', 'emails', 'reports'],
  },
  {
    id: 'excel',
    name: 'Excel',
    extension: '.xlsx',
    description: 'Microsoft Excel format with formatting and multiple sheets',
    supports: ['politicians', 'quotes', 'emails', 'reports'],
  },
  {
    id: 'pdf',
    name: 'PDF Report',
    extension: '.pdf',
    description: 'Formatted report with charts and visualizations',
    supports: ['reports'],
  },
];

const DATA_TYPES = [
  { id: 'politicians', name: 'Politicians Data', description: 'Complete politician profiles and stance classifications' },
  { id: 'quotes', name: 'Quotes & Classifications', description: 'All collected quotes with sources and classifications' },
  { id: 'emails', name: 'Email Communications', description: 'Email threads and response tracking data' },
  { id: 'reports', name: 'Analytics Reports', description: 'Compiled reports and statistics' },
];

export default function DataExport() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'export' | 'templates' | 'scheduled' | 'history'>('export');
  
  // Export states
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  
  // Form states
  const [exportForm, setExportForm] = useState({
    name: '',
    description: '',
    dataTypes: [] as string[],
    format: 'csv',
    filters: {
      includeUnverified: true,
    } as ExportFilters,
    anonymization: {
      removePersonalInfo: false,
      hashEmails: false,
      removePhoneNumbers: false,
      removeAddresses: false,
      aggregateOnly: false,
    } as AnonymizationSettings,
  });

  const canWrite = hasPermission('quotes.write'); // Using quotes permission as proxy

  // Mock data
  useEffect(() => {
    const mockJobs: ExportJob[] = [
      {
        id: 'job1',
        name: 'Weekly Politicians Report',
        description: 'Complete politician data with stance classifications',
        dataTypes: ['politicians'],
        format: 'excel',
        filters: {
          dateRange: { from: '2025-07-01', to: '2025-07-21' },
          includeUnverified: false,
        },
        anonymization: {
          removePersonalInfo: false,
          hashEmails: false,
          removePhoneNumbers: false,
          removeAddresses: false,
          aggregateOnly: false,
        },
        status: 'completed',
        progress: 100,
        createdAt: '2025-07-21T10:00:00Z',
        completedAt: '2025-07-21T10:05:23Z',
        downloadUrl: '/exports/politicians-2025-07-21.xlsx',
        fileSize: 2458432,
        recordCount: 247,
      },
      {
        id: 'job2',
        name: 'Public Anonymized Data',
        description: 'Anonymized dataset for public release',
        dataTypes: ['politicians', 'quotes'],
        format: 'json',
        filters: {
          includeUnverified: false,
        },
        anonymization: {
          removePersonalInfo: true,
          hashEmails: true,
          removePhoneNumbers: true,
          removeAddresses: true,
          aggregateOnly: false,
        },
        status: 'running',
        progress: 67,
        createdAt: '2025-07-21T14:30:00Z',
        recordCount: 156,
      },
    ];

    const mockTemplates: ReportTemplate[] = [
      {
        id: 'template1',
        name: 'Weekly Stance Summary',
        description: 'Comprehensive weekly report of politician stance classifications',
        dataTypes: ['politicians', 'quotes'],
        format: 'pdf',
        filters: {
          includeUnverified: false,
        },
        fields: ['fullName', 'party', 'constituency', 'publicStance', 'verified', 'lastUpdate'],
        anonymization: {
          removePersonalInfo: false,
          hashEmails: true,
          removePhoneNumbers: true,
          removeAddresses: true,
          aggregateOnly: false,
        },
        createdBy: 'admin@canadawill.com',
        createdAt: '2025-06-15T09:00:00Z',
        lastUsed: '2025-07-21T10:00:00Z',
        isPublic: false,
      },
      {
        id: 'template2',
        name: 'Public Data Release',
        description: 'Anonymized data template for public transparency releases',
        dataTypes: ['politicians'],
        format: 'csv',
        filters: {
          verificationStatus: ['verified'],
          includeUnverified: false,
        },
        fields: ['party', 'constituency', 'publicStance', 'electoralLevel'],
        anonymization: {
          removePersonalInfo: true,
          hashEmails: true,
          removePhoneNumbers: true,
          removeAddresses: true,
          aggregateOnly: true,
        },
        createdBy: 'admin@canadawill.com',
        createdAt: '2025-05-20T11:30:00Z',
        isPublic: true,
      },
    ];

    const mockScheduled: ScheduledExport[] = [
      {
        id: 'sched1',
        name: 'Weekly Public Report',
        description: 'Automated weekly public transparency report',
        template: mockTemplates[0],
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          hour: 9,
          minute: 0,
          timezone: 'America/Edmonton',
        },
        enabled: true,
        nextRun: '2025-07-28T09:00:00Z',
        lastRun: '2025-07-21T09:00:00Z',
        lastStatus: 'success',
        recipients: ['transparency@canadawill.com', 'media@canadawill.com'],
        createdBy: 'admin@canadawill.com',
        createdAt: '2025-06-01T10:00:00Z',
      },
    ];

    setTimeout(() => {
      setExportJobs(mockJobs);
      setReportTemplates(mockTemplates);
      setScheduledExports(mockScheduled);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStartExport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newJob: ExportJob = {
      id: `job_${Date.now()}`,
      name: exportForm.name,
      description: exportForm.description,
      dataTypes: exportForm.dataTypes,
      format: exportForm.format,
      filters: exportForm.filters,
      anonymization: exportForm.anonymization,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    setExportJobs([newJob, ...exportJobs]);
    setShowExportModal(false);
    setExportForm({
      name: '',
      description: '',
      dataTypes: [],
      format: 'csv',
      filters: { includeUnverified: true },
      anonymization: {
        removePersonalInfo: false,
        hashEmails: false,
        removePhoneNumbers: false,
        removeAddresses: false,
        aggregateOnly: false,
      },
    });

    // Simulate processing
    setTimeout(() => {
      setExportJobs(jobs => jobs.map(job => 
        job.id === newJob.id ? { ...job, status: 'running', progress: 25 } : job,
      ));
    }, 1000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Data Export & Reporting</h1>
          <p className="mt-2 text-sm text-gray-700">
            Export data, create custom reports, and manage scheduled data releases
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          {canWrite && (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              New Export
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'export', name: 'Quick Export', icon: ArrowDownTrayIcon },
              { id: 'templates', name: 'Report Templates', icon: DocumentArrowDownIcon },
              { id: 'scheduled', name: 'Scheduled Exports', icon: CalendarIcon },
              { id: 'history', name: 'Export History', icon: ClockIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Quick Export Tab */}
      {activeTab === 'export' && (
        <div className="mt-8 space-y-6">
          {/* Export Formats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EXPORT_FORMATS.map((format) => (
              <div
                key={format.id}
                className="relative group bg-white p-6 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setExportForm({ ...exportForm, format: format.id });
                  setShowExportModal(true);
                }}
              >
                <div className="flex items-center">
                  <DocumentArrowDownIcon className="h-8 w-8 text-indigo-600" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{format.name}</h3>
                    <p className="text-sm text-gray-500">{format.extension}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">{format.description}</p>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {format.supports.map((support) => (
                      <span
                        key={support}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {support}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Export Jobs</h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {exportJobs.slice(0, 5).map((job, jobIdx) => (
                    <li key={job.id}>
                      <div className="relative pb-8">
                        {jobIdx !== exportJobs.slice(0, 5).length - 1 && (
                          <span
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            {job.status === 'completed' && (
                              <CheckCircleIcon className="h-10 w-10 text-green-500" />
                            )}
                            {job.status === 'running' && (
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {job.status === 'failed' && (
                              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
                            )}
                            {job.status === 'pending' && (
                              <ClockIcon className="h-10 w-10 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{job.name}</p>
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{job.description}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              {job.recordCount && <span>{job.recordCount} records</span>}
                              {job.fileSize && <span> • {formatFileSize(job.fileSize)}</span>}
                              <span> • {new Date(job.createdAt).toLocaleString()}</span>
                            </div>
                            {job.status === 'running' && (
                              <div className="mt-2">
                                <div className="bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${job.progress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{job.progress}% complete</p>
                              </div>
                            )}
                            {job.downloadUrl && (
                              <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                                Download File
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              Create reusable report templates with custom fields and formatting
            </p>
            {canWrite && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                New Template
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reportTemplates.map((template) => (
              <div key={template.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentArrowDownIcon className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.format.toUpperCase()}</p>
                    </div>
                  </div>
                  {template.isPublic && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Public
                    </span>
                  )}
                </div>
                
                <p className="mt-3 text-sm text-gray-600">{template.description}</p>
                
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1">
                    {template.dataTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                  {template.lastUsed && (
                    <span>Last used {new Date(template.lastUsed).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                    Use Template
                  </button>
                  {canWrite && (
                    <>
                      <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Exports Tab */}
      {activeTab === 'scheduled' && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              Automate data exports and reports with flexible scheduling
            </p>
            {canWrite && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Schedule Export
              </button>
            )}
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {scheduledExports.map((scheduled) => (
                <li key={scheduled.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className={`h-5 w-5 ${scheduled.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-900">{scheduled.name}</p>
                        {scheduled.enabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Paused
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600">{scheduled.description}</p>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <span>
                          {scheduled.schedule.frequency} at {scheduled.schedule.hour.toString().padStart(2, '0')}:
                          {scheduled.schedule.minute.toString().padStart(2, '0')}
                        </span>
                        <span>•</span>
                        <span>Next: {new Date(scheduled.nextRun).toLocaleString()}</span>
                        {scheduled.lastRun && (
                          <>
                            <span>•</span>
                            <span>
                              Last: {new Date(scheduled.lastRun).toLocaleDateString()} 
                              {scheduled.lastStatus && (
                                <span className={`ml-1 ${scheduled.lastStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                  ({scheduled.lastStatus})
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        Recipients: {scheduled.recipients.join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canWrite && (
                        <>
                          <button className="text-indigo-600 hover:text-indigo-900">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            {scheduled.enabled ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {scheduledExports.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled exports</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create automated data exports to run on a regular schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export History Tab */}
      {activeTab === 'history' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Export History</h3>
              <p className="mt-1 text-sm text-gray-600">
                Complete history of all data exports and downloads
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {exportJobs.map((job) => (
                <li key={job.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <p className="text-sm font-medium text-gray-900">{job.name}</p>
                        <p className="text-sm text-gray-500">({job.format.toUpperCase()})</p>
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600">{job.description}</p>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                        {job.completedAt && (
                          <>
                            <span>•</span>
                            <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                          </>
                        )}
                        {job.recordCount && (
                          <>
                            <span>•</span>
                            <span>{job.recordCount} records</span>
                          </>
                        )}
                        {job.fileSize && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(job.fileSize)}</span>
                          </>
                        )}
                      </div>

                      {job.dataTypes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.dataTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {job.downloadUrl && (
                        <button className="inline-flex items-center rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-500">
                          <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                          Download
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTemplate ? 'Edit Report Template' : 'Create Report Template'}
                </h3>
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      defaultValue={editingTemplate?.name || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Format</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      defaultValue={editingTemplate?.format || 'csv'}
                    >
                      {EXPORT_FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name} ({format.extension})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    defaultValue={editingTemplate?.description || ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Data Types</label>
                  <div className="space-y-2">
                    {DATA_TYPES.map((dataType) => (
                      <label key={dataType.id} className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={editingTemplate?.dataTypes.includes(dataType.id) || false}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{dataType.name}</span>
                          <p className="text-xs text-gray-500">{dataType.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={editingTemplate?.isPublic || false}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                  />
                  <label className="text-sm font-medium text-gray-900">
                    Make template public (available to all users)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplate(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Schedule Automated Export</h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Export Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select a template...</option>
                      {reportTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      type="time"
                      required
                      defaultValue="09:00"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="America/Edmonton">Edmonton (MST/MDT)</option>
                      <option value="America/Toronto">Toronto (EST/EDT)</option>
                      <option value="America/Vancouver">Vancouver (PST/PDT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Recipients</label>
                  <textarea
                    rows={2}
                    placeholder="Enter email addresses, separated by commas"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recipients will receive the exported data via email when the schedule runs
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                  />
                  <label className="text-sm font-medium text-gray-900">
                    Enable scheduled export immediately
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                  >
                    Schedule Export
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Data Export</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleStartExport} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Export Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={exportForm.name}
                      onChange={(e) => setExportForm({ ...exportForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Format</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={exportForm.format}
                      onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}
                    >
                      {EXPORT_FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name} ({format.extension})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={exportForm.description}
                    onChange={(e) => setExportForm({ ...exportForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Data Types</label>
                  <div className="space-y-2">
                    {DATA_TYPES.map((dataType) => (
                      <label key={dataType.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportForm.dataTypes.includes(dataType.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportForm({
                                ...exportForm,
                                dataTypes: [...exportForm.dataTypes, dataType.id],
                              });
                            } else {
                              setExportForm({
                                ...exportForm,
                                dataTypes: exportForm.dataTypes.filter(t => t !== dataType.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{dataType.name}</span>
                          <p className="text-xs text-gray-500">{dataType.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Anonymization Options</label>
                  <div className="space-y-2">
                    {[
                      { key: 'removePersonalInfo', label: 'Remove personal information' },
                      { key: 'hashEmails', label: 'Hash email addresses' },
                      { key: 'removePhoneNumbers', label: 'Remove phone numbers' },
                      { key: 'removeAddresses', label: 'Remove addresses' },
                      { key: 'aggregateOnly', label: 'Aggregate data only (no individual records)' },
                    ].map((option) => (
                      <label key={option.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportForm.anonymization[option.key as keyof AnonymizationSettings] as boolean}
                          onChange={(e) => {
                            setExportForm({
                              ...exportForm,
                              anonymization: {
                                ...exportForm.anonymization,
                                [option.key]: e.target.checked,
                              },
                            });
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                        />
                        <span className="text-sm text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={exportForm.dataTypes.length === 0}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Start Export
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 