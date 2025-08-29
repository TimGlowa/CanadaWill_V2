import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { representApi } from '../services/representApi';
import { errorService } from '../services/errorService';

interface HealthStatus {
  backend: {
    status: 'healthy' | 'unhealthy' | 'checking';
    responseTime?: number;
    lastChecked?: string;
    error?: string;
  };
  external: {
    representApi: {
      status: 'healthy' | 'unhealthy' | 'checking';
      responseTime?: number;
      lastChecked?: string;
      error?: string;
    };
    geocodingApi: {
      status: 'healthy' | 'unhealthy' | 'checking';
      responseTime?: number;
      lastChecked?: string;
      error?: string;
    };
  };
}

const HealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    backend: { status: 'checking' },
    external: {
      representApi: { status: 'checking' },
      geocodingApi: { status: 'checking' },
    },
  });

  const [isChecking, setIsChecking] = useState(false);

  const checkBackendHealth = async () => {
    const startTime = Date.now();
    try {
      const response = await representApi.getHealthStatus();
      const responseTime = Date.now() - startTime;
      
      setHealthStatus(prev => ({
        ...prev,
        backend: {
          status: 'healthy',
          responseTime,
          lastChecked: new Date().toISOString(),
        },
      }));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setHealthStatus(prev => ({
        ...prev,
        backend: {
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  };

  const checkRepresentApi = async () => {
    const startTime = Date.now();
    try {
      // Test with a simple postal code lookup
      await representApi.geocodePostalCode('M5V3A8'); // Toronto postal code
      const responseTime = Date.now() - startTime;
      
      setHealthStatus(prev => ({
        ...prev,
        external: {
          ...prev.external,
          representApi: {
            status: 'healthy',
            responseTime,
            lastChecked: new Date().toISOString(),
          },
        },
      }));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setHealthStatus(prev => ({
        ...prev,
        external: {
          ...prev.external,
          representApi: {
            status: 'unhealthy',
            responseTime,
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      }));
    }
  };

  const checkGeocodingApi = async () => {
    const startTime = Date.now();
    try {
      // Test with a simple address lookup
      await representApi.geocodeAddress('Toronto, ON');
      const responseTime = Date.now() - startTime;
      
      setHealthStatus(prev => ({
        ...prev,
        external: {
          ...prev.external,
          geocodingApi: {
            status: 'healthy',
            responseTime,
            lastChecked: new Date().toISOString(),
          },
        },
      }));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setHealthStatus(prev => ({
        ...prev,
        external: {
          ...prev.external,
          geocodingApi: {
            status: 'unhealthy',
            responseTime,
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      }));
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    
    // Reset status to checking
    setHealthStatus({
      backend: { status: 'checking' },
      external: {
        representApi: { status: 'checking' },
        geocodingApi: { status: 'checking' },
      },
    });

    try {
      // Run health checks in parallel
      await Promise.allSettled([
        checkBackendHealth(),
        checkRepresentApi(),
        checkGeocodingApi(),
      ]);

      errorService.showSuccess('Health Check Complete', 'All services have been checked.');
    } catch (error) {
      errorService.showError('Health Check Failed', 'Some services could not be checked.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Run initial health check on component mount
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'unhealthy':
        return 'Unhealthy';
      case 'checking':
        return 'Checking...';
    }
  };

  const getStatusColor = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'unhealthy':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'checking':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">System Health Check</h2>
          <button
            onClick={runHealthCheck}
            disabled={isChecking}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Checking...' : 'Run Health Check'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend API Status */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Backend API</h3>
            <div className={`flex items-center space-x-3 p-3 rounded-md border ${getStatusColor(healthStatus.backend.status)}`}>
              {getStatusIcon(healthStatus.backend.status)}
              <div className="flex-1">
                <div className="font-medium">{getStatusText(healthStatus.backend.status)}</div>
                {healthStatus.backend.responseTime && (
                  <div className="text-sm opacity-75">
                    Response time: {healthStatus.backend.responseTime}ms
                  </div>
                )}
                {healthStatus.backend.lastChecked && (
                  <div className="text-sm opacity-75">
                    Last checked: {new Date(healthStatus.backend.lastChecked).toLocaleTimeString()}
                  </div>
                )}
                {healthStatus.backend.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {healthStatus.backend.error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* External APIs Status */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">External APIs</h3>
            <div className="space-y-3">
              {/* Represent API */}
              <div className={`flex items-center space-x-3 p-3 rounded-md border ${getStatusColor(healthStatus.external.representApi.status)}`}>
                {getStatusIcon(healthStatus.external.representApi.status)}
                <div className="flex-1">
                  <div className="font-medium">Represent API</div>
                  {healthStatus.external.representApi.responseTime && (
                    <div className="text-sm opacity-75">
                      Response time: {healthStatus.external.representApi.responseTime}ms
                    </div>
                  )}
                  {healthStatus.external.representApi.error && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {healthStatus.external.representApi.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Geocoding API */}
              <div className={`flex items-center space-x-3 p-3 rounded-md border ${getStatusColor(healthStatus.external.geocodingApi.status)}`}>
                {getStatusIcon(healthStatus.external.geocodingApi.status)}
                <div className="flex-1">
                  <div className="font-medium">Geocoding API</div>
                  {healthStatus.external.geocodingApi.responseTime && (
                    <div className="text-sm opacity-75">
                      Response time: {healthStatus.external.geocodingApi.responseTime}ms
                    </div>
                  )}
                  {healthStatus.external.geocodingApi.error && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {healthStatus.external.geocodingApi.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Configuration Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">API Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Backend URL:</strong> {representApi.getConfig().backend.baseUrl}
            </div>
            <div>
              <strong>Environment:</strong> {import.meta.env.DEV ? 'Development' : 'Production'}
            </div>
            <div>
              <strong>Represent API:</strong> {representApi.getConfig().external.representApi}
            </div>
            <div>
              <strong>Geocoding API:</strong> {representApi.getConfig().external.geocodingApi}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck; 