import React from 'react';
import { API_BASE_URL, APP_CONFIG } from '../config';

const EnvironmentInfo: React.FC = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const currentUrl = window.location.href;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <h3 className="text-sm font-medium text-blue-800 mb-2">Environment Information</h3>
      <div className="text-xs text-blue-700 space-y-1">
        <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
        <div><strong>API Base URL:</strong> {API_BASE_URL}</div>
        <div><strong>Current URL:</strong> {currentUrl}</div>
        <div><strong>App Version:</strong> {APP_CONFIG.version}</div>
        {isProduction && (
          <div className="text-green-600 font-medium">
            ✓ Running in production mode
          </div>
        )}
        {!isProduction && (
          <div className="text-yellow-600 font-medium">
            ⚠ Running in development mode
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentInfo; 