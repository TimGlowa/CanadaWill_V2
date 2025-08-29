import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import Papa from 'papaparse';

// Types for bulk operations system
export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRowCount: number;
  totalRowCount: number;
}

export interface BulkOperation {
  id: string;
  type: 'import' | 'update' | 'delete' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
  description: string;
  userId: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'bulk_update' | 'import' | 'export';
  entityType: 'politician' | 'quote' | 'classification';
  entityIds: string[];
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: {
    ip?: string;
    userAgent?: string;
    source: 'web' | 'api' | 'import';
    bulkOperationId?: string;
  };
}

export interface Command {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk_update';
  timestamp: Date;
  userId: string;
  description: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

// Command History Manager
export class CommandHistory {
  private history: Command[] = [];
  private currentIndex: number = -1;
  private maxHistorySize = 50;
  private onStateChange?: () => void;

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange;
  }

  async execute(command: Command) {
    // Remove any commands after current index (for when we undo then do something new)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    try {
      // Execute the command
      await command.execute();
      
      // Add to history
      this.history.push(command);
      this.currentIndex++;
      
      // Maintain max size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.currentIndex--;
      }
      
      this.onStateChange?.();
      return { success: true };
    } catch (error) {
      console.error('Failed to execute command:', error);
      return { success: false, error: error.message };
    }
  }

  async undo(): Promise<{ success: boolean; error?: string }> {
    if (!this.canUndo()) {
      return { success: false, error: 'Nothing to undo' };
    }

    try {
      const command = this.history[this.currentIndex];
      await command.undo();
      this.currentIndex--;
      this.onStateChange?.();
      return { success: true };
    } catch (error) {
      console.error('Failed to undo command:', error);
      return { success: false, error: error.message };
    }
  }

  async redo(): Promise<{ success: boolean; error?: string }> {
    if (!this.canRedo()) {
      return { success: false, error: 'Nothing to redo' };
    }

    try {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      await command.redo();
      this.onStateChange?.();
      return { success: true };
    } catch (error) {
      console.error('Failed to redo command:', error);
      this.currentIndex--;
      return { success: false, error: error.message };
    }
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getUndoDescription(): string | null {
    return this.canUndo() ? this.history[this.currentIndex].description : null;
  }

  getRedoDescription(): string | null {
    return this.canRedo() ? this.history[this.currentIndex + 1].description : null;
  }

  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.onStateChange?.();
  }
}

// CSV Import Validation Functions
export const validatePoliticianCSV = (data: any[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  const requiredFields = ['firstName', 'lastName', 'party', 'electoralDistrict'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;

  data.forEach((row, index) => {
    // Required field validation
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: index + 1,
          field,
          value: row[field],
          message: `${field} is required`,
          severity: 'error',
        });
      }
    });

    // Email validation
    if (row.email && !emailRegex.test(row.email)) {
      errors.push({
        row: index + 1,
        field: 'email',
        value: row.email,
        message: 'Invalid email format',
        severity: 'error',
      });
    }

    // Phone validation
    if (row.phone && !phoneRegex.test(row.phone.replace(/[\s\-()]/g, ''))) {
      warnings.push({
        row: index + 1,
        field: 'phone',
        value: row.phone,
        message: 'Phone number format may be invalid',
        severity: 'warning',
      });
    }

    // Electoral level validation
    const validLevels = ['federal', 'provincial', 'municipal'];
    if (row.electoralLevel && !validLevels.includes(row.electoralLevel.toLowerCase())) {
      warnings.push({
        row: index + 1,
        field: 'electoralLevel',
        value: row.electoralLevel,
        message: 'Electoral level should be federal, provincial, or municipal',
        severity: 'warning',
      });
    }

    // Person type validation
    const validTypes = ['candidate', 'elected_official', 'former_official'];
    if (row.personType && !validTypes.includes(row.personType.toLowerCase())) {
      warnings.push({
        row: index + 1,
        field: 'personType',
        value: row.personType,
        message: 'Person type should be candidate, elected_official, or former_official',
        severity: 'warning',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRowCount: data.length - errors.filter((e, i, arr) => arr.findIndex(e2 => e2.row === e.row) === i).length,
    totalRowCount: data.length,
  };
};

export const validateQuoteCSV = (data: any[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  const requiredFields = ['personName', 'quote', 'sourceType'];

  data.forEach((row, index) => {
    // Required field validation
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: index + 1,
          field,
          value: row[field],
          message: `${field} is required`,
          severity: 'error',
        });
      }
    });

    // Source type validation
    const validSources = ['news', 'twitter', 'facebook', 'email', 'manual'];
    if (row.sourceType && !validSources.includes(row.sourceType.toLowerCase())) {
      errors.push({
        row: index + 1,
        field: 'sourceType',
        value: row.sourceType,
        message: 'Source type must be one of: news, twitter, facebook, email, manual',
        severity: 'error',
      });
    }

    // Quote length validation
    if (row.quote && row.quote.length < 10) {
      warnings.push({
        row: index + 1,
        field: 'quote',
        value: row.quote,
        message: 'Quote seems very short',
        severity: 'warning',
      });
    }

    if (row.quote && row.quote.length > 1000) {
      warnings.push({
        row: index + 1,
        field: 'quote',
        value: row.quote,
        message: 'Quote is very long, consider truncating',
        severity: 'warning',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRowCount: data.length - errors.filter((e, i, arr) => arr.findIndex(e2 => e2.row === e.row) === i).length,
    totalRowCount: data.length,
  };
};

// Bulk Operations Hook
export const useBulkOperations = () => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandHistory | null>(null);

  useEffect(() => {
    const history = new CommandHistory(() => {
      // Trigger re-render when command history changes
      setCommandHistory(prev => prev);
    });
    setCommandHistory(history);
  }, []);

  const createOperation = useCallback((
    type: BulkOperation['type'],
    description: string,
    totalItems: number,
    userId: string,
  ): string => {
    const operation: BulkOperation = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      progress: 0,
      totalItems,
      processedItems: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
      description,
      userId,
    };

    setOperations(prev => [...prev, operation]);
    return operation.id;
  }, []);

  const updateOperation = useCallback((
    operationId: string,
    updates: Partial<BulkOperation>,
  ) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId ? { ...op, ...updates } : op,
    ));
  }, []);

  const logAuditEvent = useCallback((event: Partial<AuditLog>) => {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: 'current_user_id', // This would come from auth context
      userEmail: 'admin@canadawill.com', // This would come from auth context
      ...event as AuditLog,
    };

    setAuditLogs(prev => [...prev, log]);
    
    // In a real app, this would be sent to the backend
    console.log('[AUDIT LOG]', log);
  }, []);

  return {
    operations,
    auditLogs,
    commandHistory,
    createOperation,
    updateOperation,
    logAuditEvent,
  };
};

// CSV Import Component
interface CSVImportProps {
  onImport: (data: any[], validationResult: ValidationResult) => Promise<void>;
  entityType: 'politician' | 'quote';
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportProps> = ({ onImport, entityType, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'import'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const result = await new Promise<Papa.ParseResult<any>>((resolve) => {
        Papa.parse(selectedFile, {
          complete: resolve,
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          encoding: 'UTF-8',
        });
      });

      if (result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
      }

      setCsvData(result.data);
      
      // Validate the data
      const validation = entityType === 'politician' 
        ? validatePoliticianCSV(result.data)
        : validateQuoteCSV(result.data);
      
      setValidationResult(validation);
      setCurrentStep('preview');

    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!csvData || !validationResult) return;

    setIsProcessing(true);
    try {
      await onImport(csvData, validationResult);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Import {entityType === 'politician' ? 'Politicians' : 'Quotes'} from CSV
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload CSV file
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    CSV files only, up to 10MB
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isProcessing}
                  >
                    <DocumentArrowUpIcon className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Choose File'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Required CSV Format for {entityType === 'politician' ? 'Politicians' : 'Quotes'}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    {entityType === 'politician' ? (
                      <p>Required columns: firstName, lastName, party, electoralDistrict<br/>
                      Optional: email, phone, website, currentPosition, electoralLevel, personType</p>
                    ) : (
                      <p>Required columns: personName, quote, sourceType<br/>
                      Optional: party, sourceUrl, sourceName, sourceDate, context</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'preview' && validationResult && (
          <div className="space-y-6">
            {/* Validation Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Valid Records</p>
                    <p className="text-lg font-semibold text-green-900">{validationResult.validRowCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">Errors</p>
                    <p className="text-lg font-semibold text-red-900">{validationResult.errors.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">Warnings</p>
                    <p className="text-lg font-semibold text-yellow-900">{validationResult.warnings.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Issues */}
            {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Field
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...validationResult.errors, ...validationResult.warnings].map((issue, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{issue.row}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{issue.field}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{issue.message}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            issue.severity === 'error' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {issue.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Data Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Data Preview (first 5 rows)
              </h4>
              <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(csvData[0] || {}).map((header, index) => (
                        <th
                          key={index}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {value?.toString() || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isProcessing || !validationResult.isValid}
                className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  validationResult.isValid
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? 'Importing...' : `Import ${validationResult.validRowCount} Records`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Bulk Operations Toolbar Component
interface BulkOperationsToolbarProps {
  selectedCount: number;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription?: string;
  redoDescription?: string;
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCount,
  onBulkEdit,
  onBulkDelete,
  onBulkExport,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
}) => {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        {/* Selection Info */}
        <div className="text-sm text-gray-700">
          {selectedCount > 0 ? `${selectedCount} selected` : 'No items selected'}
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <>
            <button
              onClick={onBulkEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </button>
            <button
              onClick={onBulkExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
              Export
            </button>
          </>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Undo/Redo */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={undoDescription ? `Undo: ${undoDescription}` : 'Undo'}
            className={`p-2 rounded-md ${
              canUndo 
                ? 'text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={redoDescription ? `Redo: ${redoDescription}` : 'Redo'}
            className={`p-2 rounded-md ${
              canRedo 
                ? 'text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Import Button */}
        <button
          onClick={onImport}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <DocumentArrowUpIcon className="mr-2 h-4 w-4" />
          Import CSV
        </button>
      </div>
    </div>
  );
};

// Bulk Operations Progress Modal
interface BulkOperationProgressProps {
  operation: BulkOperation;
  onCancel?: () => void;
  onClose?: () => void;
}

export const BulkOperationProgress: React.FC<BulkOperationProgressProps> = ({
  operation,
  onCancel,
  onClose,
}) => {
  const isActive = operation.status === 'running';
  const isComplete = operation.status === 'completed';
  const isFailed = operation.status === 'failed';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {operation.description}
            </h3>
            {(isComplete || isFailed) && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-700 mb-2">
                <span>Progress</span>
                <span>{Math.round(operation.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-green-600' : 
                    isFailed ? 'bg-red-600' : 
                    isActive ? 'bg-blue-600' : 'bg-gray-400'
                  }`}
                  style={{ width: `${operation.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Status and Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 font-medium ${
                  isComplete ? 'text-green-600' :
                  isFailed ? 'text-red-600' :
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Items:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {operation.processedItems} / {operation.totalItems}
                </span>
              </div>
            </div>

            {/* Errors and Warnings */}
            {operation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors ({operation.errors.length})</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {operation.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {operation.errors.length > 3 && (
                    <li>• ... and {operation.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {operation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings ({operation.warnings.length})</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {operation.warnings.slice(0, 3).map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                  {operation.warnings.length > 3 && (
                    <li>• ... and {operation.warnings.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              {isActive && onCancel && (
                <button
                  onClick={onCancel}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              )}
              {(isComplete || isFailed) && onClose && (
                <button
                  onClick={onClose}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  CSVImportModal,
  BulkOperationsToolbar,
  BulkOperationProgress,
  useBulkOperations,
  CommandHistory,
  validatePoliticianCSV,
  validateQuoteCSV,
}; 