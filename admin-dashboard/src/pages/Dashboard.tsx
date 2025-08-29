import React from 'react';
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import EnvironmentInfo from '../components/EnvironmentInfo';
import ApiTest from '../components/ApiTest';

const Dashboard: React.FC = () => {
  // Mock data - in a real app, this would come from API calls
  const stats = [
    {
      name: 'Total Politicians',
      value: '1,234',
      icon: UserGroupIcon,
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Total Statements',
      value: '5,678',
      icon: DocumentTextIcon,
      change: '+8%',
      changeType: 'positive',
    },
    {
      name: 'News Articles',
      value: '2,345',
      icon: MagnifyingGlassIcon,
      change: '+15%',
      changeType: 'positive',
    },
    {
      name: 'Analytics Reports',
      value: '89',
      icon: ChartBarIcon,
      change: '+3%',
      changeType: 'positive',
    },
  ];

  return (
    <div className="space-y-6">
      <EnvironmentInfo />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the CanadaWill Admin Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {item.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  {item.change}
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Test */}
      <ApiTest />

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="btn-primary">
              Import New Data
            </button>
            <button className="btn-secondary">
              View Politicians
            </button>
            <button className="btn-secondary">
              Search News
            </button>
            <button className="btn-secondary">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  New politician data imported successfully
                </p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  News search completed for 15 articles
                </p>
                <p className="text-sm text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  Weekly report generated and sent
                </p>
                <p className="text-sm text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 