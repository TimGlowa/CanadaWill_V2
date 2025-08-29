import { useState } from 'react';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CogIcon, 
} from '@heroicons/react/24/outline';

interface QuoteStats {
  total: number;
  pending: number;
  classified: number;
  reviewed: number;
}

export default function AdminDashboard() {
  const [stats] = useState<QuoteStats>({
    total: 1247,
    pending: 23,
    classified: 1156,
    reviewed: 68,
  });

  const navigationItems = [
    { name: 'Quote Management', icon: DocumentTextIcon, href: '/admin/quotes', current: true },
    { name: 'Audit Trail', icon: ChartBarIcon, href: '/admin/audit', current: false },
    { name: 'User Management', icon: UserGroupIcon, href: '/admin/users', current: false },
    { name: 'Settings', icon: CogIcon, href: '/admin/settings', current: false },
  ];

  const quickActions = [
    { name: 'Review Pending Classifications', count: stats.pending, action: 'review-pending' },
    { name: 'Export Recent Changes', count: null, action: 'export-changes' },
    { name: 'Generate Reports', count: null, action: 'generate-reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage classifications, review quotes, and monitor system activity
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Quotes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Review
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pending}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Auto Classified
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.classified.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Manually Reviewed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.reviewed}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Navigation Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Management Tools
                </h3>
                <nav className="space-y-1">
                  {navigationItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`${
                          item.current
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'border-transparent text-gray-900 hover:bg-gray-50'
                        } group flex items-center px-3 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors duration-150`}
                      >
                        <IconComponent
                          className={`${
                            item.current 
                              ? 'text-indigo-500' 
                              : 'text-gray-400 group-hover:text-gray-500'
                          } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
                        />
                        <span className="truncate">{item.name}</span>
                      </a>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.action}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors duration-150"
                    >
                      <span className="font-medium text-gray-900">
                        {action.name}
                      </span>
                      {action.count && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {action.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <DocumentTextIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Classified 15 new quotes from news sources
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>2 hours ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                            <UserGroupIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Admin user reviewed 8 pending classifications
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>4 hours ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 