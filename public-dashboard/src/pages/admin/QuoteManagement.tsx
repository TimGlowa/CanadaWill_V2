import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  LinkIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import StanceBadge, { PublicStance } from '../../components/politicians/StanceBadge';

// Enhanced Quote interface matching backend StatementRecord
interface Quote {
  id: string;
  personId: string;
  personName: string;
  party: string;
  quote: string;
  context?: string;
  sourceType: 'news' | 'twitter' | 'facebook' | 'email' | 'manual';
  sourceUrl?: string;
  sourceName?: string;
  sourceDate: string;
  collectedAt: string;
  collectedBy: string;
  classification: 'Pro Canada' | 'Pro Separation' | 'No Comment'; // Legacy
  internalClassification: 'pro_canada' | 'pro_separation' | 'no_comment' | 'no_data';
  publicStance: PublicStance;
  classificationConfidence: number;
  classificationReasoning?: string;
  manuallyVerified: boolean;
  isHumanClassified: boolean;
  humanClassifier?: string;
  humanClassificationDate?: string;
  humanClassificationNotes?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_review';
  lastReviewDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface ClassificationHistory {
  id: string;
  quoteId: string;
  fromClassification: string;
  toClassification: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
  confidence?: number;
}

interface BulkEditData {
  classification?: 'pro_canada' | 'pro_separation' | 'no_comment' | 'no_data';
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'needs_review';
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export default function QuoteManagement() {
  const { hasPermission } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStance, setFilterStance] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [filterReviewStatus, setFilterReviewStatus] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [editingQuote, setEditingQuote] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [classificationHistory, setClassificationHistory] = useState<ClassificationHistory[]>([]);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const [processingBulk, setProcessingBulk] = useState(false);

  const canWrite = hasPermission('quotes.write');

  // Enhanced mock data with full StatementRecord structure
  useEffect(() => {
    const mockQuotes: Quote[] = [
      {
        id: '1',
        personId: 'p1',
        personName: 'John Smith',
        party: 'United Conservative Party',
        quote: 'Alberta is stronger as part of Canada. We will continue to work within Confederation to secure the best deal for Albertans.',
        context: 'Response during legislative session Q&A about Alberta sovereignty',
        sourceType: 'news',
        sourceUrl: 'https://calgaryherald.com/news/politics/smith-confederation',
        sourceName: 'Calgary Herald',
        sourceDate: '2025-07-20T14:30:00Z',
        collectedAt: '2025-07-20T15:00:00Z',
        collectedBy: 'news_scraper_v2',
        classification: 'Pro Canada',
        internalClassification: 'pro_canada',
        publicStance: 'Pro Canada',
        classificationConfidence: 92,
        classificationReasoning: 'Explicit statement supporting Canadian confederation and working within federal system',
        manuallyVerified: true,
        isHumanClassified: true,
        humanClassifier: 'admin@canadawill.com',
        humanClassificationDate: '2025-07-20T16:00:00Z',
        humanClassificationNotes: 'Clear pro-Canada stance, verified against full speech transcript',
        reviewStatus: 'approved',
        lastReviewDate: '2025-07-20T16:00:00Z',
        priority: 'high',
        tags: ['confederation', 'sovereignty', 'official_statement'],
      },
      {
        id: '2',
        personId: 'p2',
        personName: 'Sarah Johnson',
        party: 'New Democratic Party',
        quote: 'I refuse to answer questions about separation. That\'s not what Albertans elected me to discuss.',
        context: 'Email response to CanadaWill verification request',
        sourceType: 'email',
        sourceUrl: undefined,
        sourceName: 'Direct email response',
        sourceDate: '2025-07-19T10:15:00Z',
        collectedAt: '2025-07-19T10:20:00Z',
        collectedBy: 'email_parser',
        classification: 'No Comment',
        internalClassification: 'no_comment',
        publicStance: 'Pro Separation', // Transformed per grouping rules
        classificationConfidence: 45,
        classificationReasoning: 'Explicit refusal to comment on separation - groups with pro-separation per policy',
        manuallyVerified: false,
        isHumanClassified: false,
        reviewStatus: 'needs_review',
        priority: 'medium',
        tags: ['no_comment', 'email_response'],
      },
      {
        id: '3',
        personId: 'p3',
        personName: 'Michael Chen',
        party: 'Alberta Party',
        quote: 'Alberta separation would be economically devastating. We need to work with Ottawa, not against it.',
        context: 'Campaign rally speech in Calgary-Fish Creek',
        sourceType: 'facebook',
        sourceUrl: 'https://facebook.com/MichaelChenAB/posts/123456789',
        sourceName: 'Facebook',
        sourceDate: '2025-07-18T19:45:00Z',
        collectedAt: '2025-07-18T20:00:00Z',
        collectedBy: 'social_media_monitor',
        classification: 'Pro Canada',
        internalClassification: 'pro_canada',
        publicStance: 'Pro Canada',
        classificationConfidence: 88,
        classificationReasoning: 'Explicitly opposes Alberta separation, advocates for federal cooperation',
        manuallyVerified: false,
        isHumanClassified: false,
        reviewStatus: 'pending',
        priority: 'medium',
        tags: ['economic_argument', 'social_media', 'campaign'],
      },
      {
        id: '4',
        personId: 'p4',
        personName: 'Robert Taylor',
        party: 'Wildrose Independence Party',
        quote: 'It\'s time for Alberta to explore all options for achieving true sovereignty and control over our resources.',
        context: 'Interview on local radio show about party platform',
        sourceType: 'news',
        sourceUrl: 'https://660news.com/taylor-independence-interview',
        sourceName: '660 News Radio',
        sourceDate: '2025-07-17T08:30:00Z',
        collectedAt: '2025-07-17T09:00:00Z',
        collectedBy: 'news_scraper_v2',
        classification: 'Pro Separation',
        internalClassification: 'pro_separation',
        publicStance: 'Pro Separation',
        classificationConfidence: 95,
        classificationReasoning: 'Direct advocacy for Alberta sovereignty and independence options',
        manuallyVerified: true,
        isHumanClassified: true,
        humanClassifier: 'editor@canadawill.com',
        humanClassificationDate: '2025-07-17T12:00:00Z',
        humanClassificationNotes: 'Clear separatist position consistent with party platform',
        reviewStatus: 'approved',
        lastReviewDate: '2025-07-17T12:00:00Z',
        priority: 'high',
        tags: ['sovereignty', 'resources', 'party_platform'],
      },
      {
        id: '5',
        personId: 'p5',
        personName: 'Lisa Anderson',
        party: 'Liberal',
        quote: 'We haven\'t taken a position on that issue at this time.',
        context: 'Response to journalist question during press conference',
        sourceType: 'twitter',
        sourceUrl: 'https://twitter.com/LisaAndersonAB/status/1234567890',
        sourceName: 'Twitter',
        sourceDate: '2025-07-16T14:20:00Z',
        collectedAt: '2025-07-16T14:25:00Z',
        collectedBy: 'twitter_monitor',
        classification: 'No Comment',
        internalClassification: 'no_comment',
        publicStance: 'Pro Separation', // Transformed per grouping rules
        classificationConfidence: 30,
        classificationReasoning: 'Non-committal response - classified as no comment, groups with pro-separation',
        manuallyVerified: false,
        isHumanClassified: false,
        reviewStatus: 'needs_review',
        priority: 'low',
        tags: ['no_position', 'press_conference'],
      },
    ];

    // Mock classification history
    const mockHistory: ClassificationHistory[] = [
      {
        id: 'h1',
        quoteId: '2',
        fromClassification: 'no_data',
        toClassification: 'no_comment',
        changedBy: 'AI Classification System',
        changedAt: '2025-07-19T10:20:00Z',
        reason: 'Initial AI classification based on email content',
        confidence: 45,
      },
      {
        id: 'h2',
        quoteId: '1',
        fromClassification: 'pro_canada',
        toClassification: 'pro_canada',
        changedBy: 'admin@canadawill.com',
        changedAt: '2025-07-20T16:00:00Z',
        reason: 'Human verification confirmed AI classification',
        confidence: 92,
      },
    ];

    setTimeout(() => {
      setQuotes(mockQuotes);
      setClassificationHistory(mockHistory);
      setLoading(false);
    }, 1000);
  }, []);

  const getDateFilteredQuotes = (quotes: Quote[]) => {
    if (filterDateRange === 'all') return quotes;
    
    const now = new Date();
    let cutoffDate: Date;

    switch (filterDateRange) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (!customDateFrom) return quotes;
        cutoffDate = new Date(customDateFrom);
        const endDate = customDateTo ? new Date(customDateTo) : now;
        return quotes.filter(quote => {
          const quoteDate = new Date(quote.sourceDate);
          return quoteDate >= cutoffDate && quoteDate <= endDate;
        });
      default:
        return quotes;
    }

    return quotes.filter(quote => new Date(quote.sourceDate) >= cutoffDate);
  };

  const filteredQuotes = getDateFilteredQuotes(quotes).filter(quote => {
    const matchesSearch = quote.quote.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.sourceName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStance = filterStance === 'all' || quote.publicStance === filterStance;
    const matchesSource = filterSource === 'all' || quote.sourceType === filterSource;
    const matchesReviewStatus = filterReviewStatus === 'all' || quote.reviewStatus === filterReviewStatus;
    const matchesConfidence = filterConfidence === 'all' || 
                             (filterConfidence === 'high' && quote.classificationConfidence >= 80) ||
                             (filterConfidence === 'medium' && quote.classificationConfidence >= 60 && quote.classificationConfidence < 80) ||
                             (filterConfidence === 'low' && quote.classificationConfidence < 60);
    
    return matchesSearch && matchesStance && matchesSource && matchesConfidence && matchesReviewStatus;
  });

  const handleSelectQuote = (quoteId: string) => {
    const newSelected = new Set(selectedQuotes);
    if (newSelected.has(quoteId)) {
      newSelected.delete(quoteId);
    } else {
      newSelected.add(quoteId);
    }
    setSelectedQuotes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuotes.size === filteredQuotes.length) {
      setSelectedQuotes(new Set());
    } else {
      setSelectedQuotes(new Set(filteredQuotes.map(q => q.id)));
    }
  };

  const handleStanceChange = (quoteId: string, newClassification: 'pro_canada' | 'pro_separation' | 'no_comment' | 'no_data') => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    // Transform internal classification to public stance
    const publicStance: PublicStance = newClassification === 'pro_canada' ? 'Pro Canada' :
                                     newClassification === 'pro_separation' ? 'Pro Separation' :
                                     newClassification === 'no_comment' ? 'Pro Separation' : // Grouping rule
                                     'No Position';

    const updatedQuote = {
      ...quote,
      internalClassification: newClassification,
      publicStance,
      manuallyVerified: true,
      isHumanClassified: true,
      humanClassifier: 'admin@canadawill.com', // Would be current user
      humanClassificationDate: new Date().toISOString(),
      reviewStatus: 'approved' as const,
      lastReviewDate: new Date().toISOString(),
    };

    setQuotes(quotes.map(q => q.id === quoteId ? updatedQuote : q));
    setEditingQuote(null);

    // Add to classification history
    const historyEntry: ClassificationHistory = {
      id: `h_${Date.now()}`,
      quoteId,
      fromClassification: quote.internalClassification,
      toClassification: newClassification,
      changedBy: 'admin@canadawill.com',
      changedAt: new Date().toISOString(),
      reason: 'Manual classification override by admin',
    };
    setClassificationHistory([...classificationHistory, historyEntry]);
  };

  const handleBulkEdit = async () => {
    if (selectedQuotes.size === 0) return;
    
    setProcessingBulk(true);
    try {
      const updatedQuotes = quotes.map(quote => {
        if (!selectedQuotes.has(quote.id)) return quote;

        const updates: Partial<Quote> = { ...quote };
        
        if (bulkEditData.classification) {
          updates.internalClassification = bulkEditData.classification;
          updates.publicStance = bulkEditData.classification === 'pro_canada' ? 'Pro Canada' :
                                 bulkEditData.classification === 'pro_separation' ? 'Pro Separation' :
                                 bulkEditData.classification === 'no_comment' ? 'Pro Separation' :
                                 'No Position';
          updates.manuallyVerified = true;
          updates.isHumanClassified = true;
          updates.humanClassifier = 'admin@canadawill.com';
          updates.humanClassificationDate = new Date().toISOString();
        }
        
        if (bulkEditData.reviewStatus) {
          updates.reviewStatus = bulkEditData.reviewStatus;
          updates.lastReviewDate = new Date().toISOString();
        }
        
        if (bulkEditData.priority) {
          updates.priority = bulkEditData.priority;
        }

        return updates as Quote;
      });

      setQuotes(updatedQuotes);
      setSelectedQuotes(new Set());
      setBulkEditData({});
      setShowBulkEditModal(false);
    } finally {
      setProcessingBulk(false);
    }
  };

  const openDetailModal = (quote: Quote) => {
    setViewingQuote(quote);
    setShowDetailModal(true);
  };

  const openHistoryModal = (quote: Quote) => {
    setViewingQuote(quote);
    setShowHistoryModal(true);
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'news': return <DocumentTextIcon className="h-4 w-4" />;
      case 'email': return <EnvelopeIcon className="h-4 w-4" />;
      case 'twitter': case 'facebook': return <LinkIcon className="h-4 w-4" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
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
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Quote Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review and manage political quote classifications with advanced filtering and batch operations
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-3">
          <button className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Export Selected
          </button>
          {selectedQuotes.size > 0 && (
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Bulk Edit ({selectedQuotes.size})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Quotes</dt>
                    <dd className="text-lg font-medium text-gray-900">{quotes.length}</dd>
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
                      {quotes.filter(q => q.manuallyVerified).length}
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
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Needs Review</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {quotes.filter(q => q.reviewStatus === 'needs_review').length}
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
                  <ChartBarIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">High Priority</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {quotes.filter(q => q.priority === 'high').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search quotes, politicians, sources..."
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
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="news">News</option>
            <option value="email">Email</option>
            <option value="twitter">Twitter</option>
            <option value="facebook">Facebook</option>
            <option value="manual">Manual</option>
          </select>

          <select
            className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value)}
          >
            <option value="all">All Confidence</option>
            <option value="high">High (80%+)</option>
            <option value="medium">Medium (60-80%)</option>
            <option value="low">Low (&lt; 60%)</option>
          </select>

          <select
            className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={filterReviewStatus}
            onChange={(e) => setFilterReviewStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {filterDateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {selectedQuotes.size > 0 ? `${selectedQuotes.size} selected` : 'Select all'}
                    </span>
                  </label>
                  <p className="text-sm text-gray-700">
                    Showing {filteredQuotes.length} of {quotes.length} quotes
                  </p>
                </div>
              </div>

              <ul className="divide-y divide-gray-200 bg-white">
                {filteredQuotes.map((quote) => (
                  <li key={quote.id} className="px-6 py-4">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedQuotes.has(quote.id)}
                        onChange={() => handleSelectQuote(quote.id)}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1 text-gray-400">
                              {getSourceIcon(quote.sourceType)}
                              <span className="text-xs uppercase">{quote.sourceType}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{quote.personName}</p>
                            <span className="text-sm text-gray-500">({quote.party})</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(quote.priority)}`}>
                              {quote.priority}
                            </span>
                            {quote.manuallyVerified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckIcon className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openDetailModal(quote)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openHistoryModal(quote)}
                              className="text-gray-600 hover:text-gray-900"
                              title="View History"
                            >
                              <ClockIcon className="h-4 w-4" />
                            </button>
                            {canWrite && (
                              <button
                                onClick={() => setEditingQuote(editingQuote === quote.id ? null : quote.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit Classification"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-700 leading-5">
                          "{quote.quote.length > 200 ? `${quote.quote.substring(0, 200)}...` : quote.quote}"
                        </p>

                        {quote.context && (
                          <p className="mt-1 text-xs text-gray-500 italic">
                            Context: {quote.context}
                          </p>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <span>Stance:</span>
                              {editingQuote === quote.id ? (
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={quote.internalClassification}
                                    onChange={(e) => handleStanceChange(quote.id, e.target.value as any)}
                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="pro_canada">Pro Canada</option>
                                    <option value="pro_separation">Pro Separation</option>
                                    <option value="no_comment">No Comment</option>
                                    <option value="no_data">No Data</option>
                                  </select>
                                  <button
                                    onClick={() => setEditingQuote(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <StanceBadge
                                    stance={quote.publicStance}
                                    showTooltip={false}
                                  />
                                  <span className="text-xs text-gray-400">
                                    ({quote.internalClassification})
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Confidence:</span>
                              <span className={`font-medium ${quote.classificationConfidence >= 80 ? 'text-green-600' : 
                                              quote.classificationConfidence >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {quote.classificationConfidence}%
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Status:</span>
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getReviewStatusColor(quote.reviewStatus)}`}>
                                {quote.reviewStatus.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {quote.sourceUrl && (
                              <a
                                href={quote.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-900"
                              >
                                <LinkIcon className="h-3 w-3" />
                                <span>Source</span>
                              </a>
                            )}
                            <span>{quote.sourceName}</span>
                            <span>{new Date(quote.sourceDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {quote.tags && quote.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {quote.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              {filteredQuotes.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No quotes match your current filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && viewingQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Quote Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900 leading-6">"{viewingQuote.quote}"</p>
                  {viewingQuote.context && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Context: {viewingQuote.context}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Politician</p>
                    <p className="text-sm text-gray-900">{viewingQuote.personName}</p>
                    <p className="text-xs text-gray-500">{viewingQuote.party}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Source</p>
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(viewingQuote.sourceType)}
                      <span className="text-sm text-gray-900">{viewingQuote.sourceName}</span>
                    </div>
                    {viewingQuote.sourceUrl && (
                      <a
                        href={viewingQuote.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-900"
                      >
                        View Source
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Classification</p>
                    <div className="flex items-center space-x-2">
                      <StanceBadge
                        stance={viewingQuote.publicStance}
                        showTooltip={false}
                      />
                      <span className="text-xs text-gray-500">
                        Internal: {viewingQuote.internalClassification}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Confidence: {viewingQuote.classificationConfidence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Review Status</p>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getReviewStatusColor(viewingQuote.reviewStatus)}`}>
                      {viewingQuote.reviewStatus.replace('_', ' ')}
                    </span>
                    {viewingQuote.lastReviewDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last reviewed: {new Date(viewingQuote.lastReviewDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {viewingQuote.classificationReasoning && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Classification Reasoning</p>
                    <p className="text-sm text-gray-600">{viewingQuote.classificationReasoning}</p>
                  </div>
                )}

                {viewingQuote.humanClassificationNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Human Reviewer Notes</p>
                    <p className="text-sm text-gray-600">{viewingQuote.humanClassificationNotes}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      By {viewingQuote.humanClassifier} on{' '}
                      {new Date(viewingQuote.humanClassificationDate!).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Source Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingQuote.sourceDate).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Collected Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingQuote.collectedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">By {viewingQuote.collectedBy}</p>
                  </div>
                </div>

                {viewingQuote.tags && viewingQuote.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingQuote.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classification History Modal */}
      {showHistoryModal && viewingQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Classification History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {classificationHistory
                  .filter(h => h.quoteId === viewingQuote.id)
                  .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                  .map((history) => (
                    <div key={history.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {history.fromClassification} → {history.toClassification}
                          </span>
                          {history.confidence && (
                            <span className="text-xs text-gray-500">
                              ({history.confidence}% confidence)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(history.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        By: {history.changedBy}
                      </p>
                      {history.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reason: {history.reason}
                        </p>
                      )}
                    </div>
                  ))}
                
                {classificationHistory.filter(h => h.quoteId === viewingQuote.id).length === 0 && (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No History</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No classification changes have been recorded for this quote.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Bulk Edit ({selectedQuotes.size} quotes)
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
                  <label className="block text-sm font-medium text-gray-700">Classification</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.classification || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, classification: e.target.value as any })}
                  >
                    <option value="">No Change</option>
                    <option value="pro_canada">Pro Canada</option>
                    <option value="pro_separation">Pro Separation</option>
                    <option value="no_comment">No Comment</option>
                    <option value="no_data">No Data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Status</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.reviewStatus || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, reviewStatus: e.target.value as any })}
                  >
                    <option value="">No Change</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="needs_review">Needs Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={bulkEditData.priority || ''}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, priority: e.target.value as any })}
                  >
                    <option value="">No Change</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
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