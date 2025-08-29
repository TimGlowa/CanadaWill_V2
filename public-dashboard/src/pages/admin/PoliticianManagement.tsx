import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  UserIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import StanceBadge, { PublicStance } from '../../components/politicians/StanceBadge';
import { 
  CSVImportModal, 
  BulkOperationsToolbar, 
  BulkOperationProgress,
  useBulkOperations,
  ValidationResult,
  BulkOperation,
} from './BulkOperations';

// Define the full politician interface matching backend models
interface Politician {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  currentPosition?: string;
  party?: string;
  electoralDistrict?: string;
  electoralLevel: 'federal' | 'provincial' | 'municipal';
  personType: 'candidate' | 'elected_official' | 'former_official';
  email?: string;
  phone?: string;
  website?: string;
  officeAddress?: string;
  currentStance: 'Pro Canada' | 'Pro Separation' | 'No Comment'; // Legacy
  stanceClassification: {
    internalClassification: 'pro_canada' | 'pro_separation' | 'no_comment' | 'no_data';
    publicStance: PublicStance;
    confidence: number;
    requiresExplicitConfirmation: boolean;
    wasTransformed: boolean;
    lastUpdated: string;
  };
  stanceConfidence: number;
  lastStanceUpdate: string;
  runningForReelection?: boolean | null;
  reelectionConfirmationDate?: string;
  eligibleForBadge: boolean;
  badgeIssued?: boolean;
  badgeUrl?: string;
  createdAt: string;
  updatedAt: string;
  dataSource: string;
  verified: boolean;
  verificationNotes?: string;
  postalCodes?: string[];
}

interface PoliticianFormData {
  firstName: string;
  lastName: string;
  currentPosition: string;
  party: string;
  electoralDistrict: string;
  electoralLevel: 'federal' | 'provincial' | 'municipal';
  personType: 'candidate' | 'elected_official' | 'former_official';
  email: string;
  phone: string;
  website: string;
  officeAddress: string;
  internalClassification: 'pro_canada' | 'pro_separation' | 'no_comment' | 'no_data';
  stanceConfidence: number;
  runningForReelection: boolean | null;
  verificationNotes: string;
}

const emptyForm: PoliticianFormData = {
  firstName: '',
  lastName: '',
  currentPosition: '',
  party: '',
  electoralDistrict: '',
  electoralLevel: 'provincial',
  personType: 'elected_official',
  email: '',
  phone: '',
  website: '',
  officeAddress: '',
  internalClassification: 'no_data',
  stanceConfidence: 50,
  runningForReelection: null,
  verificationNotes: '',
};

export default function PoliticianManagement() {
  const { hasPermission } = useAuth();
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStance, setFilterStance] = useState<string>('all');
  const [filterParty, setFilterParty] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVerified, setFilterVerified] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPoliticians, setSelectedPoliticians] = useState<Set<string>>(new Set());
  const [editingPolitician, setEditingPolitician] = useState<string | null>(null);
  const [viewingPolitician, setViewingPolitician] = useState<Politician | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState<PoliticianFormData>(emptyForm);
  const [bulkEditData, setBulkEditData] = useState<any>({});
  const [processingBulk, setProcessingBulk] = useState(false);

  // Enhanced bulk operations
  const {
    operations,
    auditLogs,
    commandHistory,
    createOperation,
    updateOperation,
    logAuditEvent,
  } = useBulkOperations();

  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);

  const canWrite = hasPermission('politicians.write');

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockPoliticians: Politician[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        currentPosition: 'MLA for Calgary-Centre',
        party: 'United Conservative Party',
        electoralDistrict: 'Calgary-Centre',
        electoralLevel: 'provincial',
        personType: 'elected_official',
        email: 'john.smith@assembly.ab.ca',
        phone: '(403) 297-4444',
        website: 'https://johnsmith.ca',
        officeAddress: '615 Macleod Trail SE, Calgary, AB T2G 4T8',
        currentStance: 'Pro Canada',
        stanceClassification: {
          internalClassification: 'pro_canada',
          publicStance: 'Pro Canada',
          confidence: 85,
          requiresExplicitConfirmation: true,
          wasTransformed: false,
          lastUpdated: '2025-07-20T14:30:00Z',
        },
        stanceConfidence: 85,
        lastStanceUpdate: '2025-07-20T14:30:00Z',
        runningForReelection: true,
        reelectionConfirmationDate: '2025-07-15T10:00:00Z',
        eligibleForBadge: true,
        badgeIssued: true,
        badgeUrl: 'https://badges.canadawill.com/john-smith.png',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-07-20T14:30:00Z',
        dataSource: 'manual_entry',
        verified: true,
        verificationNotes: 'Confirmed stance via email response 2025-07-15',
        postalCodes: ['T2G', 'T2P', 'T3A'],
      },
      {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        currentPosition: 'MLA for Edmonton-Glenora',
        party: 'New Democratic Party',
        electoralDistrict: 'Edmonton-Glenora',
        electoralLevel: 'provincial',
        personType: 'elected_official',
        email: 'sarah.johnson@assembly.ab.ca',
        phone: '(780) 414-0702',
        website: 'https://sarahjohnson.ca',
        officeAddress: '10320 142 Street NW, Edmonton, AB T5N 2N2',
        currentStance: 'No Comment',
        stanceClassification: {
          internalClassification: 'no_comment',
          publicStance: 'Pro Separation',
          confidence: 45,
          requiresExplicitConfirmation: false,
          wasTransformed: true,
          lastUpdated: '2025-07-19T16:20:00Z',
        },
        stanceConfidence: 45,
        lastStanceUpdate: '2025-07-19T16:20:00Z',
        runningForReelection: null,
        eligibleForBadge: false,
        badgeIssued: false,
        createdAt: '2025-01-20T11:00:00Z',
        updatedAt: '2025-07-19T16:20:00Z',
        dataSource: 'csv_import',
        verified: false,
        verificationNotes: 'No response to email verification request',
        postalCodes: ['T5N', 'T5R', 'T6A'],
      },
      {
        id: '3',
        firstName: 'Michael',
        lastName: 'Chen',
        fullName: 'Michael Chen',
        currentPosition: 'Candidate for Calgary-Fish Creek',
        party: 'Alberta Party',
        electoralDistrict: 'Calgary-Fish Creek',
        electoralLevel: 'provincial',
        personType: 'candidate',
        email: 'michael.chen@albertaparty.ca',
        phone: '(403) 555-0123',
        currentStance: 'No Comment',
        stanceClassification: {
          internalClassification: 'no_data',
          publicStance: 'No Position',
          confidence: 0,
          requiresExplicitConfirmation: false,
          wasTransformed: false,
          lastUpdated: '2025-07-10T12:00:00Z',
        },
        stanceConfidence: 0,
        lastStanceUpdate: '2025-07-10T12:00:00Z',
        runningForReelection: true,
        eligibleForBadge: false,
        badgeIssued: false,
        createdAt: '2025-02-01T13:00:00Z',
        updatedAt: '2025-07-10T12:00:00Z',
        dataSource: 'web_scraping',
        verified: false,
        postalCodes: ['T2J', 'T2H'],
      },
    ];

    setTimeout(() => {
      setPoliticians(mockPoliticians);
      setLoading(false);
    }, 1000);
  }, []);

  const uniqueParties = Array.from(new Set(politicians.map(p => p.party).filter(Boolean)));

  const filteredPoliticians = politicians.filter(politician => {
    const matchesSearch = politician.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         politician.currentPosition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         politician.party?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         politician.electoralDistrict?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStance = filterStance === 'all' || politician.stanceClassification.publicStance === filterStance;
    const matchesParty = filterParty === 'all' || politician.party === filterParty;
    const matchesLevel = filterLevel === 'all' || politician.electoralLevel === filterLevel;
    const matchesVerified = filterVerified === 'all' || 
                           (filterVerified === 'verified' && politician.verified) ||
                           (filterVerified === 'unverified' && !politician.verified);
    
    return matchesSearch && matchesStance && matchesParty && matchesLevel && matchesVerified;
  });

  // Enhanced bulk selection handlers
  const handleSelectAll = () => {
    if (selectedPoliticians.size === filteredPoliticians.length) {
      setSelectedPoliticians(new Set());
    } else {
      setSelectedPoliticians(new Set(filteredPoliticians.map(p => p.id)));
    }
  };

  const handleSelectPolitician = (politicianId: string) => {
    const newSelected = new Set(selectedPoliticians);
    if (newSelected.has(politicianId)) {
      newSelected.delete(politicianId);
    } else {
      newSelected.add(politicianId);
    }
    setSelectedPoliticians(newSelected);
  };

  // Enhanced bulk operations with audit logging and undo/redo
  const handleBulkEdit = async () => {
    if (selectedPoliticians.size === 0) return;

    const operationId = createOperation('update', `Bulk edit ${selectedPoliticians.size} politicians`, selectedPoliticians.size, 'current_user');
    const originalData = [...politicians];

    try {
      updateOperation(operationId, { status: 'running' });

      const updatedPoliticians = politicians.map(politician => {
        if (!selectedPoliticians.has(politician.id)) return politician;

        const updates: Partial<Politician> = { ...politician };
        let hasChanges = false;
        const changes: { field: string; oldValue: any; newValue: any }[] = [];

        // Apply bulk updates with change tracking
        if (bulkEditData.party && bulkEditData.party !== politician.party) {
          changes.push({ field: 'party', oldValue: politician.party, newValue: bulkEditData.party });
          updates.party = bulkEditData.party;
          hasChanges = true;
        }

        if (bulkEditData.electoralLevel && bulkEditData.electoralLevel !== politician.electoralLevel) {
          changes.push({ field: 'electoralLevel', oldValue: politician.electoralLevel, newValue: bulkEditData.electoralLevel });
          updates.electoralLevel = bulkEditData.electoralLevel;
          hasChanges = true;
        }

        if (bulkEditData.verified !== undefined && bulkEditData.verified !== politician.verified) {
          changes.push({ field: 'verified', oldValue: politician.verified, newValue: bulkEditData.verified });
          updates.verified = bulkEditData.verified;
          hasChanges = true;
        }

        if (bulkEditData.internalClassification && bulkEditData.internalClassification !== politician.stanceClassification.internalClassification) {
          changes.push({ 
            field: 'stanceClassification.internalClassification', 
            oldValue: politician.stanceClassification.internalClassification, 
            newValue: bulkEditData.internalClassification, 
          });
          updates.stanceClassification = {
            ...politician.stanceClassification,
            internalClassification: bulkEditData.internalClassification,
            publicStance: bulkEditData.internalClassification === 'pro_canada' ? 'Pro Canada' :
                         bulkEditData.internalClassification === 'pro_separation' ? 'Pro Separation' :
                         'No Position',
            lastUpdated: new Date().toISOString(),
            wasTransformed: true,
          };
          hasChanges = true;
        }

        if (hasChanges) {
          updates.updatedAt = new Date().toISOString();
          
          // Log individual audit event
          logAuditEvent({
            action: 'bulk_update',
            entityType: 'politician',
            entityIds: [politician.id],
            changes,
            metadata: {
              source: 'web',
              bulkOperationId: operationId,
            },
          });
        }

        return updates as Politician;
      });

      // Create undo/redo command
      if (commandHistory) {
        const command = {
          id: `bulk_edit_${Date.now()}`,
          type: 'bulk_update' as const,
          timestamp: new Date(),
          userId: 'current_user',
          description: `Bulk edit ${selectedPoliticians.size} politicians`,
          execute: async () => {
            setPoliticians(updatedPoliticians);
          },
          undo: async () => {
            setPoliticians(originalData);
          },
          redo: async () => {
            setPoliticians(updatedPoliticians);
          },
        };
        
        await commandHistory.execute(command);
      } else {
        setPoliticians(updatedPoliticians);
      }

      updateOperation(operationId, { 
        status: 'completed', 
        progress: 100,
        processedItems: selectedPoliticians.size,
      });

      setSelectedPoliticians(new Set());
      setBulkEditData({});
      setShowBulkEditModal(false);

    } catch (error) {
      console.error('Bulk edit failed:', error);
             updateOperation(operationId, { 
         status: 'failed',
         errors: ['Bulk edit operation failed: ' + (error as Error).message],
       });
    }
  };

  // CSV Import handler
  const handleCSVImport = async (csvData: any[], validationResult: ValidationResult) => {
    const operationId = createOperation('import', `Import ${validationResult.validRowCount} politicians from CSV`, validationResult.validRowCount, 'current_user');
    
    try {
      updateOperation(operationId, { status: 'running' });
      
      const newPoliticians: Politician[] = [];
      let processedCount = 0;

      for (const row of csvData) {
        // Skip invalid rows
        const hasRowErrors = validationResult.errors.some(error => error.row === csvData.indexOf(row) + 1);
        if (hasRowErrors) continue;

        const newPolitician: Politician = {
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          firstName: row.firstName || '',
          lastName: row.lastName || '',
          fullName: `${row.firstName} ${row.lastName}`,
          currentPosition: row.currentPosition || '',
          party: row.party || '',
          electoralDistrict: row.electoralDistrict || '',
          electoralLevel: row.electoralLevel?.toLowerCase() || 'provincial',
          personType: row.personType?.toLowerCase() || 'elected_official',
          email: row.email || '',
          phone: row.phone || '',
          website: row.website || '',
          officeAddress: row.officeAddress || '',
          currentStance: 'No Comment', // Legacy field
          stanceClassification: {
            internalClassification: 'no_data',
            publicStance: 'No Position',
            confidence: 0,
            requiresExplicitConfirmation: true,
            wasTransformed: false,
            lastUpdated: new Date().toISOString(),
          },
          stanceConfidence: 0,
          lastStanceUpdate: new Date().toISOString(),
          runningForReelection: row.runningForReelection === 'true' || row.runningForReelection === true ? true : null,
          eligibleForBadge: false,
          badgeIssued: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dataSource: 'csv_import',
          verified: false,
          verificationNotes: '',
          postalCodes: [],
        };

        newPoliticians.push(newPolitician);
        processedCount++;

        // Update progress
        updateOperation(operationId, {
          progress: (processedCount / validationResult.validRowCount) * 100,
          processedItems: processedCount,
        });

        // Simulate processing delay for demo purposes
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update politicians list
      const originalData = [...politicians];
      const updatedPoliticians = [...politicians, ...newPoliticians];

      // Create undo command
      if (commandHistory) {
        const command = {
          id: `csv_import_${Date.now()}`,
          type: 'create' as const,
          timestamp: new Date(),
          userId: 'current_user',
          description: `Import ${newPoliticians.length} politicians from CSV`,
          execute: async () => {
            setPoliticians(updatedPoliticians);
          },
          undo: async () => {
            setPoliticians(originalData);
          },
          redo: async () => {
            setPoliticians(updatedPoliticians);
          },
        };
        
        await commandHistory.execute(command);
      } else {
        setPoliticians(updatedPoliticians);
      }

      // Log audit event
      logAuditEvent({
        action: 'import',
        entityType: 'politician',
        entityIds: newPoliticians.map(p => p.id),
        changes: [{ field: 'bulk_import', oldValue: null, newValue: `${newPoliticians.length} records` }],
        metadata: {
          source: 'web',
          bulkOperationId: operationId,
        },
      });

      updateOperation(operationId, { 
        status: 'completed',
        progress: 100,
        processedItems: processedCount,
      });

         } catch (error) {
       console.error('CSV import failed:', error);
       updateOperation(operationId, {
         status: 'failed',
         errors: ['CSV import failed: ' + (error as Error).message],
       });
     }
  };

  // Enhanced bulk delete with confirmation
  const handleBulkDelete = async () => {
    if (selectedPoliticians.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedPoliticians.size} politicians? This action cannot be undone via the UI, but is tracked in the audit log.`);
    if (!confirmed) return;

    const operationId = createOperation('delete', `Delete ${selectedPoliticians.size} politicians`, selectedPoliticians.size, 'current_user');
    const originalData = [...politicians];

    try {
      updateOperation(operationId, { status: 'running' });

      const deletedIds = Array.from(selectedPoliticians);
      const updatedPoliticians = politicians.filter(p => !selectedPoliticians.has(p.id));

      // Create undo command
      if (commandHistory) {
        const command = {
          id: `bulk_delete_${Date.now()}`,
          type: 'delete' as const,
          timestamp: new Date(),
          userId: 'current_user',
          description: `Delete ${selectedPoliticians.size} politicians`,
          execute: async () => {
            setPoliticians(updatedPoliticians);
          },
          undo: async () => {
            setPoliticians(originalData);
          },
          redo: async () => {
            setPoliticians(updatedPoliticians);
          },
        };
        
        await commandHistory.execute(command);
      } else {
        setPoliticians(updatedPoliticians);
      }

      // Log audit event
      logAuditEvent({
        action: 'delete',
        entityType: 'politician',
        entityIds: deletedIds,
        changes: [{ field: 'bulk_delete', oldValue: 'exists', newValue: 'deleted' }],
        metadata: {
          source: 'web',
          bulkOperationId: operationId,
        },
      });

      updateOperation(operationId, {
        status: 'completed',
        progress: 100,
        processedItems: selectedPoliticians.size,
      });

      setSelectedPoliticians(new Set());

         } catch (error) {
       console.error('Bulk delete failed:', error);
       updateOperation(operationId, {
         status: 'failed',
         errors: ['Bulk delete failed: ' + (error as Error).message],
       });
     }
   };

   // Bulk export handler
   const handleBulkExport = async () => {
     if (selectedPoliticians.size === 0) return;

     const operationId = createOperation('export', `Export ${selectedPoliticians.size} politicians`, selectedPoliticians.size, 'current_user');
     
     try {
       updateOperation(operationId, { status: 'running' });

       const selectedData = politicians.filter(p => selectedPoliticians.has(p.id));
       
       // Convert to CSV format
       const csvData = selectedData.map(politician => ({
         firstName: politician.firstName,
         lastName: politician.lastName,
         party: politician.party,
         electoralDistrict: politician.electoralDistrict,
         electoralLevel: politician.electoralLevel,
         currentPosition: politician.currentPosition,
         email: politician.email,
         phone: politician.phone,
         website: politician.website,
         stance: politician.stanceClassification.publicStance,
         verified: politician.verified,
         createdAt: politician.createdAt,
       }));

       // Create and download CSV
       const csvString = [
         Object.keys(csvData[0]).join(','),
         ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(',')),
       ].join('\n');

       const blob = new Blob([csvString], { type: 'text/csv' });
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `politicians_export_${new Date().toISOString().split('T')[0]}.csv`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       window.URL.revokeObjectURL(url);

       // Log audit event
       logAuditEvent({
         action: 'export',
         entityType: 'politician',
         entityIds: Array.from(selectedPoliticians),
         changes: [{ field: 'bulk_export', oldValue: null, newValue: 'csv_file' }],
         metadata: {
           source: 'web',
           bulkOperationId: operationId,
         },
       });

       updateOperation(operationId, {
         status: 'completed',
         progress: 100,
         processedItems: selectedPoliticians.size,
       });

     } catch (error) {
       console.error('Bulk export failed:', error);
       updateOperation(operationId, {
         status: 'failed',
         errors: ['Bulk export failed: ' + (error as Error).message],
       });
     }
  };

  // Undo/Redo handlers
  const handleUndo = async () => {
    if (commandHistory) {
      const result = await commandHistory.undo();
      if (!result.success) {
        alert(result.error || 'Undo failed');
      }
    }
  };

  const handleRedo = async () => {
    if (commandHistory) {
      const result = await commandHistory.redo();
      if (!result.success) {
        alert(result.error || 'Redo failed');
      }
    }
  };

  // Individual politician operations
  const handleAddPolitician = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingBulk(true);

    try {
      const newPolitician: Politician = {
        id: Date.now().toString(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        currentPosition: formData.currentPosition,
        party: formData.party,
        electoralDistrict: formData.electoralDistrict,
        electoralLevel: formData.electoralLevel,
        personType: formData.personType,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        officeAddress: formData.officeAddress,
        currentStance: 'No Comment',
        stanceClassification: {
          internalClassification: formData.internalClassification,
          publicStance: formData.internalClassification === 'pro_canada' ? 'Pro Canada' :
                       formData.internalClassification === 'pro_separation' ? 'Pro Separation' :
                       formData.internalClassification === 'no_comment' ? 'Pro Separation' : 'No Position',
          confidence: formData.stanceConfidence,
          requiresExplicitConfirmation: false,
          wasTransformed: formData.internalClassification === 'no_comment',
          lastUpdated: new Date().toISOString(),
        },
        stanceConfidence: formData.stanceConfidence,
        lastStanceUpdate: new Date().toISOString(),
        runningForReelection: formData.runningForReelection,
        eligibleForBadge: false,
        badgeIssued: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dataSource: 'manual_entry',
        verified: false,
        verificationNotes: formData.verificationNotes,
      };

      setPoliticians([...politicians, newPolitician]);
      setFormData(emptyForm);
      setShowAddModal(false);
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleEditPolitician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolitician) return;

    setProcessingBulk(true);
    try {
      const politician = politicians.find(p => p.id === editingPolitician);
      if (!politician) return;

      const updatedPolitician: Politician = {
        ...politician,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        currentPosition: formData.currentPosition,
        party: formData.party,
        electoralDistrict: formData.electoralDistrict,
        electoralLevel: formData.electoralLevel,
        personType: formData.personType,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        officeAddress: formData.officeAddress,
        stanceClassification: {
          ...politician.stanceClassification,
          internalClassification: formData.internalClassification,
          publicStance: formData.internalClassification === 'pro_canada' ? 'Pro Canada' :
                       formData.internalClassification === 'pro_separation' ? 'Pro Separation' :
                       formData.internalClassification === 'no_comment' ? 'Pro Separation' : 'No Position',
          confidence: formData.stanceConfidence,
          lastUpdated: new Date().toISOString(),
        },
        stanceConfidence: formData.stanceConfidence,
        lastStanceUpdate: new Date().toISOString(),
        runningForReelection: formData.runningForReelection !== undefined ? formData.runningForReelection : null,
        updatedAt: new Date().toISOString(),
        verificationNotes: formData.verificationNotes,
      };

      setPoliticians(politicians.map(p => p.id === editingPolitician ? updatedPolitician : p));
      setEditingPolitician(null);
      setShowEditModal(false);
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleDeletePolitician = async (politicianId: string) => {
    if (!confirm('Are you sure you want to delete this politician?')) return;
    setPoliticians(politicians.filter(p => p.id !== politicianId));
  };

  const openEditModal = (politician: Politician) => {
    setEditingPolitician(politician.id);
    setFormData({
      firstName: politician.firstName,
      lastName: politician.lastName,
      currentPosition: politician.currentPosition || '',
      party: politician.party || '',
      electoralDistrict: politician.electoralDistrict || '',
      electoralLevel: politician.electoralLevel,
      personType: politician.personType,
      email: politician.email || '',
      phone: politician.phone || '',
      website: politician.website || '',
      officeAddress: politician.officeAddress || '',
      internalClassification: politician.stanceClassification.internalClassification,
      stanceConfidence: politician.stanceConfidence,
      runningForReelection: politician.runningForReelection,
      verificationNotes: politician.verificationNotes || '',
    });
    setShowEditModal(true);
  };

  const openDetailModal = (politician: Politician) => {
    setViewingPolitician(politician);
    setShowDetailModal(true);
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
      {/* Enhanced Header with Bulk Operations */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Politician Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage politician profiles, stances, and verification status with advanced bulk operations.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Politician
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {canWrite && (
        <BulkOperationsToolbar
          selectedCount={selectedPoliticians.size}
          onBulkEdit={() => setShowBulkEditModal(true)}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          onImport={() => setShowImportModal(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={commandHistory?.canUndo() || false}
          canRedo={commandHistory?.canRedo() || false}
          undoDescription={commandHistory?.getUndoDescription() || undefined}
          redoDescription={commandHistory?.getRedoDescription() || undefined}
        />
      )}

      {/* Stats */}
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Politicians</dt>
                    <dd className="text-lg font-medium text-gray-900">{politicians.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {politicians.filter(p => p.verified).length}
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
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Elected Officials</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {politicians.filter(p => p.personType === 'elected_official').length}
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
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pro Canada</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {politicians.filter(p => p.stanceClassification.publicStance === 'Pro Canada').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search politicians..."
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <select
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={filterStance}
          onChange={(e) => setFilterStance(e.target.value)}
        >
          <option value="all">All Stances</option>
          <option value="Pro Canada">Pro Canada</option>
          <option value="Pro Separation">Pro Separation</option>
          <option value="No Position">No Position</option>
        </select>

        <select
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value)}
        >
          <option value="all">All Parties</option>
          {uniqueParties.map(party => (
            <option key={party} value={party}>{party}</option>
          ))}
        </select>

        <select
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="all">All Levels</option>
          <option value="federal">Federal</option>
          <option value="provincial">Provincial</option>
          <option value="municipal">Municipal</option>
        </select>

        <select
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={filterVerified}
          onChange={(e) => setFilterVerified(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Politicians Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative px-6 py-3">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedPoliticians.size === filteredPoliticians.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Politician
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Position & Party
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Stance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPoliticians.map((politician) => (
                    <tr key={politician.id}>
                      <td className="relative px-6 py-4">
                        <input
                          type="checkbox"
                          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedPoliticians.has(politician.id)}
                          onChange={() => handleSelectPolitician(politician.id)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-800">
                                {politician.firstName[0]}{politician.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{politician.fullName}</div>
                            <div className="text-sm text-gray-500">{politician.electoralDistrict}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{politician.currentPosition}</div>
                        <div className="text-sm text-gray-500">{politician.party}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <StanceBadge
                            stance={politician.stanceClassification.publicStance}
                            showTooltip={false}
                            size="sm"
                          />
                          <span className="text-xs text-gray-500">
                            {politician.stanceConfidence}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {politician.verified ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                              Pending
                            </span>
                          )}
                          {politician.badgeIssued && (
                            <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                              Badge
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openDetailModal(politician)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canWrite && (
                            <>
                              <button
                                onClick={() => openEditModal(politician)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePolitician(politician.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {showAddModal ? 'Add New Politician' : 'Edit Politician'}
              </h3>
              <form onSubmit={showAddModal ? handleAddPolitician : handleEditPolitician} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Position</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.currentPosition}
                    onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Party</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.party}
                      onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Electoral District</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.electoralDistrict}
                      onChange={(e) => setFormData({ ...formData, electoralDistrict: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Electoral Level</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.electoralLevel}
                      onChange={(e) => setFormData({ ...formData, electoralLevel: e.target.value as any })}
                    >
                      <option value="federal">Federal</option>
                      <option value="provincial">Provincial</option>
                      <option value="municipal">Municipal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Person Type</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.personType}
                      onChange={(e) => setFormData({ ...formData, personType: e.target.value as any })}
                    >
                      <option value="elected_official">Elected Official</option>
                      <option value="candidate">Candidate</option>
                      <option value="former_official">Former Official</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Office Address</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.officeAddress}
                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Internal Stance Classification</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.internalClassification}
                      onChange={(e) => setFormData({ ...formData, internalClassification: e.target.value as any })}
                    >
                      <option value="no_data">No Data</option>
                      <option value="no_comment">No Comment</option>
                      <option value="pro_canada">Pro Canada</option>
                      <option value="pro_separation">Pro Separation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stance Confidence (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.stanceConfidence}
                      onChange={(e) => setFormData({ ...formData, stanceConfidence: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Running for Re-election</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.runningForReelection === null ? 'unknown' : formData.runningForReelection.toString()}
                    onChange={(e) => setFormData({ ...formData, runningForReelection: e.target.value === 'unknown' ? null : e.target.value === 'true' })}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification Notes</label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.verificationNotes}
                    onChange={(e) => setFormData({ ...formData, verificationNotes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setFormData(emptyForm);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : showAddModal ? 'Add Politician' : 'Update Politician'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && viewingPolitician && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Politician Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-indigo-800">
                      {viewingPolitician.firstName[0]}{viewingPolitician.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{viewingPolitician.fullName}</h4>
                    <p className="text-gray-600">{viewingPolitician.currentPosition}</p>
                    <p className="text-gray-500 text-sm">{viewingPolitician.party}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Electoral District</p>
                    <p className="text-sm text-gray-900">{viewingPolitician.electoralDistrict}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Electoral Level</p>
                    <p className="text-sm text-gray-900 capitalize">{viewingPolitician.electoralLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{viewingPolitician.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{viewingPolitician.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Stance</p>
                  <div className="flex items-center space-x-3">
                    <StanceBadge
                      stance={viewingPolitician.stanceClassification.publicStance}
                      showTooltip={false}
                    />
                    <span className="text-sm text-gray-600">
                      Confidence: {viewingPolitician.stanceConfidence}%
                    </span>
                    {viewingPolitician.stanceClassification.wasTransformed && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Transformed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Internal: {viewingPolitician.stanceClassification.internalClassification}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                  <div className="flex items-center space-x-2">
                    {viewingPolitician.verified ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                        Pending Verification
                      </span>
                    )}
                    {viewingPolitician.badgeIssued && (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        Badge Issued
                      </span>
                    )}
                    {viewingPolitician.runningForReelection === true && (
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        Running for Re-election
                      </span>
                    )}
                  </div>
                </div>

                {viewingPolitician.verificationNotes && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Verification Notes</p>
                    <p className="text-sm text-gray-600">{viewingPolitician.verificationNotes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingPolitician.updatedAt).toLocaleDateString()} at{' '}
                    {new Date(viewingPolitician.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <CSVImportModal
          entityType="politician"
          onImport={handleCSVImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Bulk Operation Progress Modal */}
      {activeOperation && (
        <BulkOperationProgress
          operation={activeOperation}
          onClose={() => setActiveOperation(null)}
        />
      )}

      {/* Enhanced Bulk Edit Modal with more options */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Bulk Edit ({selectedPoliticians.size} politicians)
                </h3>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Party</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.party || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, party: e.target.value })}
                  >
                    <option value="">No Change</option>
                    <option value="United Conservative Party">United Conservative Party</option>
                    <option value="New Democratic Party">New Democratic Party</option>
                    <option value="Liberal">Liberal</option>
                    <option value="Conservative">Conservative</option>
                    <option value="Independent">Independent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Electoral Level</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.electoralLevel || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, electoralLevel: e.target.value })}
                  >
                    <option value="">No Change</option>
                    <option value="federal">Federal</option>
                    <option value="provincial">Provincial</option>
                    <option value="municipal">Municipal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stance Classification</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.internalClassification || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, internalClassification: e.target.value })}
                  >
                    <option value="">No Change</option>
                    <option value="pro_canada">Pro Canada</option>
                    <option value="pro_separation">Pro Separation</option>
                    <option value="no_comment">No Comment</option>
                    <option value="no_data">No Data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.verified !== undefined ? bulkEditData.verified.toString() : ''}
                    onChange={(e) => setBulkEditData({ 
                      ...bulkEditData, 
                      verified: e.target.value === '' ? undefined : e.target.value === 'true', 
                    })}
                  >
                    <option value="">No Change</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkEditModal(false);
                      setBulkEditData({});
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkEdit}
                    disabled={processingBulk || Object.keys(bulkEditData).length === 0}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {processingBulk ? 'Processing...' : 'Apply Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 