import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { APP_CONFIG } from '../config';

const ApiTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    health: string;
    auth: string;
    loading: boolean;
  }>({
    health: '',
    auth: '',
    loading: false,
  });

  const testHealthCheck = async () => {
    setTestResults(prev => ({ ...prev, loading: true, health: '' }));
    try {
      const response = await apiService.get('/health');
      setTestResults(prev => ({ 
        ...prev, 
        health: `✅ Health check successful: ${JSON.stringify(response)}`,
        loading: false 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        health: `❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        loading: false 
      }));
    }
  };

  const testAuth = async () => {
    setTestResults(prev => ({ ...prev, loading: true, auth: '' }));
    try {
      // Try to access a protected endpoint
      const response = await apiService.get('/politicians');
      setTestResults(prev => ({ 
        ...prev, 
        auth: `✅ Authentication successful: ${JSON.stringify(response).substring(0, 100)}...`,
        loading: false 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        auth: `❌ Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        loading: false 
      }));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">API Connectivity Test</h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testHealthCheck}
            disabled={testResults.loading}
            className="btn-primary mr-2"
          >
            Test Health Check
          </button>
          <button
            onClick={testAuth}
            disabled={testResults.loading}
            className="btn-secondary"
          >
            Test Authentication
          </button>
        </div>

        {testResults.loading && (
          <div className="text-blue-600">Testing API connectivity...</div>
        )}

        {testResults.health && (
          <div className="text-sm">
            <strong>Health Check:</strong> {testResults.health}
          </div>
        )}

        {testResults.auth && (
          <div className="text-sm">
            <strong>Authentication:</strong> {testResults.auth}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <div><strong>API Base URL:</strong> {APP_CONFIG.apiBaseUrl}</div>
          <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
        </div>
      </div>
    </div>
  );
};

export default ApiTest; 