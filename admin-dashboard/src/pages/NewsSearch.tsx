import React, { useState } from 'react';
import { MagnifyingGlassIcon, PlayIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface SearchJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  query: string;
  startedAt: string;
  completedAt?: string;
  articlesFound?: number;
}

const NewsSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);

  // Mock data - in a real app, this would come from API calls
  const recentSearches: SearchJob[] = [
    {
      id: '1',
      status: 'completed',
      query: 'Justin Trudeau climate change',
      startedAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:35:00Z',
      articlesFound: 15
    },
    {
      id: '2',
      status: 'completed',
      query: 'Pierre Poilievre economy',
      startedAt: '2024-01-15T09:15:00Z',
      completedAt: '2024-01-15T09:20:00Z',
      articlesFound: 12
    },
    {
      id: '3',
      status: 'running',
      query: 'Jagmeet Singh healthcare',
      startedAt: '2024-01-15T11:00:00Z'
    },
    {
      id: '4',
      status: 'failed',
      query: 'Elizabeth May environment',
      startedAt: '2024-01-15T08:45:00Z',
      completedAt: '2024-01-15T08:47:00Z'
    }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    
    // Create new search job
    const newJob: SearchJob = {
      id: Date.now().toString(),
      status: 'running',
      query: searchQuery,
      startedAt: new Date().toISOString()
    };

    setActiveJobs(prev => [newJob, ...prev]);
    setSearchQuery('');

    try {
      // Mock API call - in a real app, this would trigger the news search
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update job status to completed
      setActiveJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: 'completed', completedAt: new Date().toISOString(), articlesFound: Math.floor(Math.random() * 20) + 5 }
          : job
      ));
    } catch (error) {
      // Update job status to failed
      setActiveJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: 'failed', completedAt: new Date().toISOString() }
          : job
      ));
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: SearchJob['status']) => {
    switch (status) {
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <CheckCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: SearchJob['status']) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: SearchJob['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const allJobs = [...activeJobs, ...recentSearches];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">News Search</h1>
        <p className="text-gray-600">Trigger news searches to find politician statements and positions</p>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="search-query"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input pl-10"
                      placeholder="Enter search terms (e.g., 'Justin Trudeau climate change')"
                      disabled={isSearching}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {isSearching ? 'Searching...' : 'Start Search'}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>Search queries should include politician names and topics to find relevant news articles and statements.</p>
              <p className="mt-1">Examples:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>"Justin Trudeau climate change"</li>
                <li>"Pierre Poilievre economy inflation"</li>
                <li>"Jagmeet Singh healthcare"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Search History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Search History
          </h3>

          {allJobs.length === 0 ? (
            <div className="text-center py-8">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No searches yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start your first news search above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allJobs.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {job.query}
                        </p>
                        <p className="text-sm text-gray-500">
                          Started: {formatDate(job.startedAt)}
                        </p>
                        {job.completedAt && (
                          <p className="text-sm text-gray-500">
                            Completed: {formatDate(job.completedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                      {job.articlesFound && (
                        <span className="text-sm text-gray-500">
                          {job.articlesFound} articles
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Statistics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Search Statistics
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {allJobs.filter(job => job.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed Searches</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {allJobs.filter(job => job.status === 'running').length}
              </div>
              <div className="text-sm text-gray-500">Active Searches</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {allJobs.reduce((total, job) => total + (job.articlesFound || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Articles Found</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsSearch; 