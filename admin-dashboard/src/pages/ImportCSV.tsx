import React, { useState } from 'react';
import { DocumentArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/apiService';
import { APP_CONFIG } from '../config';

const ImportCSV: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStatus('idle');
      setMessage('');
    } else {
      setMessage('Please select a valid CSV file.');
      setUploadStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setMessage('');

    try {
      // Use the API service to upload the file
      await apiService.uploadFile(APP_CONFIG.endpoints.import, file);
      
      setUploadStatus('success');
      setMessage(`Successfully uploaded ${file.name}. Processing data...`);
      setFile(null);
      
      // Reset form
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setMessage('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import CSV Data</h1>
        <p className="text-gray-600">Upload CSV files to import politician data into the system</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {/* File Upload Area */}
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
              </div>
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center">
                  <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{file.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div className={`rounded-md p-4 ${
                uploadStatus === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : uploadStatus === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {uploadStatus === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    ) : uploadStatus === 'error' ? (
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                    ) : (
                      <DocumentArrowUpIcon className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${
                      uploadStatus === 'success' 
                        ? 'text-green-800' 
                        : uploadStatus === 'error'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }`}>
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            CSV Format Requirements
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Your CSV file should include the following columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>name</strong> - Full name of the politician</li>
              <li><strong>party</strong> - Political party affiliation</li>
              <li><strong>riding</strong> - Electoral district/riding</li>
              <li><strong>province</strong> - Province or territory</li>
              <li><strong>level</strong> - Government level (federal, provincial, municipal)</li>
              <li><strong>email</strong> - Contact email (optional)</li>
              <li><strong>website</strong> - Official website (optional)</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> The first row should contain column headers. 
              All text fields should be properly quoted if they contain commas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCSV; 