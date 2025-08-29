import { useState, useEffect } from 'react';
import {
  CogIcon,
  EnvelopeIcon,
  KeyIcon,
  ServerIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  maintenanceMode: boolean;
  maxQuotesPerDay: number;
  classificationThreshold: number;
  enableNotifications: boolean;
}

interface ApiSettings {
  openaiApiKey: string;
  openaiModel: string;
  openaiTemperature: number;
  openaiMaxTokens: number;
  representApiEnabled: boolean;
  representApiUrl: string;
}

interface EmailSettings {
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapPassword: string;
  imapSSL: boolean;
  emailPollingInterval: number;
  maxEmailsPerPoll: number;
}

interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  enableTwoFactor: boolean;
}

export default function Settings() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: 'CanadaWill Admin',
    siteDescription: 'Political stance tracking system for Alberta separation',
    contactEmail: 'admin@canadawill.com',
    maintenanceMode: false,
    maxQuotesPerDay: 1000,
    classificationThreshold: 0.7,
    enableNotifications: true,
  });

  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: 'gpt-4',
    openaiTemperature: 0.1,
    openaiMaxTokens: 500,
    representApiEnabled: true,
    representApiUrl: 'https://represent.opennorth.ca/representatives/',
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUsername: 'verify@backcanada.com',
    imapPassword: '',
    imapSSL: true,
    emailPollingInterval: 30,
    maxEmailsPerPoll: 50,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 60,
    maxLoginAttempts: 3,
    passwordMinLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    enableTwoFactor: false,
  });

  const canWrite = hasPermission('settings.write');

  const tabs = [
    { id: 'system', name: 'System', icon: CogIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage({ type: 'success', message: `${section} settings saved successfully` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: `Failed to save ${section} settings` });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: string) => {
    try {
      // Mock connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveMessage({ type: 'success', message: `${type} connection successful` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: `${type} connection failed` });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-700">
          Configure system settings, API keys, and integrations
        </p>
      </div>

      {/* Success/Error Messages */}
      {saveMessage && (
        <div className={`mb-6 rounded-md p-4 ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {saveMessage.type === 'success' ? (
                <CheckIcon className="h-5 w-5 text-green-400" />
              ) : (
                <XMarkIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{saveMessage.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {/* System Settings */}
      {activeTab === 'system' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <CogIcon className="h-5 w-5 mr-2" />
            System Settings
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Site Name</label>
                <input
                  type="text"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={systemSettings.siteName}
                  onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                <input
                  type="email"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={systemSettings.contactEmail}
                  onChange={(e) => setSystemSettings({ ...systemSettings, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Site Description</label>
              <textarea
                rows={3}
                disabled={!canWrite}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                value={systemSettings.siteDescription}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteDescription: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Quotes Per Day</label>
                <input
                  type="number"
                  min="1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={systemSettings.maxQuotesPerDay}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxQuotesPerDay: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Classification Threshold</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={systemSettings.classificationThreshold}
                  onChange={(e) => setSystemSettings({ ...systemSettings, classificationThreshold: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Maintenance Mode
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={systemSettings.enableNotifications}
                  onChange={(e) => setSystemSettings({ ...systemSettings, enableNotifications: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable Notifications
                </label>
              </div>
            </div>

            {canWrite && (
              <div className="pt-4">
                <button
                  onClick={() => handleSave('System')}
                  disabled={saving}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Settings */}
      {activeTab === 'api' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <KeyIcon className="h-5 w-5 mr-2" />
            API Keys & Configuration
          </h2>
          
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Security Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>API keys are sensitive. Only enter them if you understand the security implications.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">OpenAI API Key</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="password"
                  disabled={!canWrite}
                  placeholder="sk-..."
                  className="block w-full rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={apiSettings.openaiApiKey}
                  onChange={(e) => setApiSettings({ ...apiSettings, openaiApiKey: e.target.value })}
                />
                <button
                  onClick={() => testConnection('OpenAI')}
                  disabled={!apiSettings.openaiApiKey || saving}
                  className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">OpenAI Model</label>
                <select
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={apiSettings.openaiModel}
                  onChange={(e) => setApiSettings({ ...apiSettings, openaiModel: e.target.value })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={apiSettings.openaiTemperature}
                  onChange={(e) => setApiSettings({ ...apiSettings, openaiTemperature: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  max="4000"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={apiSettings.openaiMaxTokens}
                  onChange={(e) => setApiSettings({ ...apiSettings, openaiMaxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={apiSettings.representApiEnabled}
                  onChange={(e) => setApiSettings({ ...apiSettings, representApiEnabled: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable Represent API Integration
                </label>
              </div>

              {apiSettings.representApiEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Represent API URL</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="url"
                      disabled={!canWrite}
                      className="block w-full rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                      value={apiSettings.representApiUrl}
                      onChange={(e) => setApiSettings({ ...apiSettings, representApiUrl: e.target.value })}
                    />
                    <button
                      onClick={() => testConnection('Represent API')}
                      disabled={!apiSettings.representApiUrl || saving}
                      className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Test
                    </button>
                  </div>
                </div>
              )}
            </div>

            {canWrite && (
              <div className="pt-4">
                <button
                  onClick={() => handleSave('API')}
                  disabled={saving}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save API Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Email Configuration
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">IMAP Host</label>
                <input
                  type="text"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.imapHost}
                  onChange={(e) => setEmailSettings({ ...emailSettings, imapHost: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">IMAP Port</label>
                <input
                  type="number"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.imapPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, imapPort: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.imapUsername}
                  onChange={(e) => setEmailSettings({ ...emailSettings, imapUsername: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.imapPassword}
                  onChange={(e) => setEmailSettings({ ...emailSettings, imapPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Polling Interval (minutes)</label>
                <input
                  type="number"
                  min="1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.emailPollingInterval}
                  onChange={(e) => setEmailSettings({ ...emailSettings, emailPollingInterval: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Emails Per Poll</label>
                <input
                  type="number"
                  min="1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={emailSettings.maxEmailsPerPoll}
                  onChange={(e) => setEmailSettings({ ...emailSettings, maxEmailsPerPoll: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                disabled={!canWrite}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                checked={emailSettings.imapSSL}
                onChange={(e) => setEmailSettings({ ...emailSettings, imapSSL: e.target.checked })}
              />
              <label className="ml-2 block text-sm text-gray-900">
                Use SSL/TLS
              </label>
            </div>

            {canWrite && (
              <div className="pt-4 space-x-3">
                <button
                  onClick={() => testConnection('Email')}
                  disabled={saving || !emailSettings.imapHost || !emailSettings.imapUsername}
                  className="inline-flex justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50"
                >
                  Test Connection
                </button>
                
                <button
                  onClick={() => handleSave('Email')}
                  disabled={saving}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2" />
            Security Settings
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
                <input
                  type="number"
                  min="1"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password Min Length</label>
                <input
                  type="number"
                  min="4"
                  disabled={!canWrite}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={securitySettings.requireSpecialChars}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Require Special Characters in Passwords
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={securitySettings.requireNumbers}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Require Numbers in Passwords
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  checked={securitySettings.enableTwoFactor}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, enableTwoFactor: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable Two-Factor Authentication
                </label>
              </div>
            </div>

            {canWrite && (
              <div className="pt-4">
                <button
                  onClick={() => handleSave('Security')}
                  disabled={saving}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 