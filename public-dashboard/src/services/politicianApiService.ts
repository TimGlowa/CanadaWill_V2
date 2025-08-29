// CanadaWill Politician API Service for Frontend
// Connects to backend politician endpoints with stance classification support

import { Politician } from '../components/politicians/PoliticianCard';
import { apiBaseUrl, isDevelopment } from '../config/api';

// Types for API responses
export interface PoliticianApiResponse {
  data: Politician[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
  filters: {
    stance?: string;
    party?: string;
    district?: string;
    level?: string;
    search?: string;
    runningForReelection?: boolean;
  };
  summary: {
    totalPoliticians: number;
    stanceBreakdown: {
      'Pro Canada': number;
      'Pro Separation': number;
      'No Position': number;
    };
    lastUpdated: string;
  };
  meta: {
    stanceTransformationApplied: boolean;
    transformationRules: Record<string, string>;
  };
}

export interface PoliticianDetailResponse {
  id: string;
  fullName: string;
  currentPosition?: string;
  party?: string;
  electoralDistrict?: string;
  currentStance: string;
  publicStance: 'Pro Canada' | 'Pro Separation' | 'No Position';
  stanceConfidence: number;
  lastStanceUpdate: string;
  runningForReelection?: boolean | null;
  eligibleForBadge: boolean;
  badgeUrl?: string;
  totalStatements: number;
  lastVerified: string;
  stanceWasTransformed?: boolean;
  statements: Array<{
    id: string;
    quote: string;
    sourceType: string;
    sourceUrl?: string;
    sourceDate: string;
    publicStance: string;
    confidence: number;
    verified: boolean;
    collectedAt: string;
  }>;
  stanceHistory: Array<{
    date: string;
    internalClassification: string;
    publicStance: string;
    confidence: number;
    source: string;
    statement: string;
  }>;
}

export interface CoordinatesLookupResponse {
  success: boolean;
  data: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    candidates: any[];
    representatives: any[];
    totalCandidates: number;
    totalRepresentatives: number;
    timestamp: string;
  };
}

// Configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Error handling utilities
const handleApiError = (error: any, context: string): never => {
  // Log raw error in development only
  if (isDevelopment) {
    console.error(`API Error in ${context}:`, error);
  }

  // Check for specific coordinate validation errors
  if (error.message?.includes('invalid coordinates') || 
      error.message?.includes('Latitude must be between') ||
      error.message?.includes('Longitude must be between')) {
    throw new Error('Could not locate that point. Please adjust the map pin or try a nearby address.');
  }

  // Generic error handling
  if (error.message?.includes('Request timeout')) {
    throw new Error('Request timed out. Please try again.');
  }

  if (error.message?.includes('API request failed: 404')) {
    throw new Error('No representatives found for this location.');
  }

  if (error.message?.includes('API request failed: 500')) {
    throw new Error('Server error. Please try again later.');
  }

  // Default error message
  throw new Error('Unable to fetch data. Please try again.');
};

class PoliticianApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();

  // Cache management
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Request helper with timeout and error handling
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        
        // Try to parse error message from response
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Get all politicians with filtering and pagination
  async getPoliticians(params: {
    stance?: string;
    page?: number;
    limit?: number;
    search?: string;
    party?: string;
    district?: string;
    level?: string;
    runningForReelection?: boolean;
  } = {}): Promise<PoliticianApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.stance) queryParams.append('stance', params.stance);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.party) queryParams.append('party', params.party);
    if (params.district) queryParams.append('district', params.district);
    if (params.level) queryParams.append('level', params.level);
    if (params.runningForReelection !== undefined) {
      queryParams.append('runningForReelection', params.runningForReelection.toString());
    }

    const cacheKey = `politicians_${queryParams.toString()}`;
    const cached = this.getCachedData<PoliticianApiResponse>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${apiBaseUrl}/politicians?${queryParams.toString()}`;
      const response = await this.makeRequest<PoliticianApiResponse>(url);
      
      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      return handleApiError(error, 'getPoliticians');
    }
  }

  // Get specific politician by ID
  async getPolitician(id: string): Promise<PoliticianDetailResponse> {
    const cacheKey = `politician_${id}`;
    const cached = this.getCachedData<PoliticianDetailResponse>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${apiBaseUrl}/politicians/${id}`;
      const response = await this.makeRequest<PoliticianDetailResponse>(url);
      
      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      return handleApiError(error, 'getPolitician');
    }
  }

  /**
   * Get politicians by coordinates (PRIMARY CONTRACT)
   * This method uses coordinates to determine the riding and returns relevant candidates
   * Address → geocode to coordinates → call /api/v1/politicians/candidates/coordinates/:lat/:lng
   */
  async getPoliticiansByCoordinates(latitude: number, longitude: number): Promise<CoordinatesLookupResponse> {
    const cacheKey = `coordinates_${latitude}_${longitude}`;
    const cached = this.getCachedData<CoordinatesLookupResponse>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${apiBaseUrl}/politicians/candidates/coordinates/${latitude}/${longitude}`;
      const response = await this.makeRequest<CoordinatesLookupResponse>(url);
      
      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      return handleApiError(error, 'getPoliticiansByCoordinates');
    }
  }

  // Get stance history for a politician
  async getStanceHistory(id: string): Promise<{
    personId: string;
    stanceHistory: Array<{
      date: string;
      internalClassification: string;
      publicStance: string;
      confidence: number;
      source: string;
      statement: string;
    }>;
    transformationAudits: Array<{
      id: string;
      fromClassification: string;
      toPublicStance: string;
      ruleApplied: string;
      transformedAt: string;
      context: string;
    }>;
    lastUpdated: string;
  }> {
    const cacheKey = `stance_history_${id}`;
    const cached = this.getCachedData<{
      personId: string;
      stanceHistory: Array<{
        date: string;
        internalClassification: string;
        publicStance: string;
        confidence: number;
        source: string;
        statement: string;
      }>;
      transformationAudits: Array<{
        id: string;
        fromClassification: string;
        toPublicStance: string;
        ruleApplied: string;
        transformedAt: string;
        context: string;
      }>;
      lastUpdated: string;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${apiBaseUrl}/politicians/${id}/stance-history`;
      const response = await this.makeRequest<{
        personId: string;
        stanceHistory: Array<{
          date: string;
          internalClassification: string;
          publicStance: string;
          confidence: number;
          source: string;
          statement: string;
        }>;
        transformationAudits: Array<{
          id: string;
          fromClassification: string;
          toPublicStance: string;
          ruleApplied: string;
          transformedAt: string;
          context: string;
        }>;
        lastUpdated: string;
      }>(url);
      
      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      return handleApiError(error, 'getStanceHistory');
    }
  }

  // Search politicians with stance filtering
  async searchPoliticians(query: string, filters: {
    stance?: string;
    party?: string;
    district?: string;
    level?: string;
  } = {}): Promise<PoliticianApiResponse> {
    return this.getPoliticians({
      search: query,
      ...filters,
      page: 1,
      limit: 50
    });
  }

  // Get stance breakdown statistics
  async getStanceBreakdown(): Promise<{
    totalPoliticians: number;
    stanceBreakdown: {
      'Pro Canada': number;
      'Pro Separation': number;
      'No Position': number;
    };
    lastUpdated: string;
  }> {
    const cacheKey = 'stance_breakdown';
    const cached = this.getCachedData<{
      totalPoliticians: number;
      stanceBreakdown: {
        'Pro Canada': number;
        'Pro Separation': number;
        'No Position': number;
      };
      lastUpdated: string;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.getPoliticians({ limit: 1 });
      const breakdown = response.summary;
      
      this.setCachedData(cacheKey, breakdown);
      return breakdown;
    } catch (error) {
      return handleApiError(error, 'getStanceBreakdown');
    }
  }

  // Get politicians with stance changes in a date range
  async getStanceChanges(fromDate: string, toDate: string): Promise<{
    dateRange: {
      from: string;
      to: string;
    };
    totalPeopleWithChanges: number;
    changes: any[];
  }> {
    try {
      const url = `${apiBaseUrl}/politicians/stance-changes?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`;
      return await this.makeRequest(url);
    } catch (error) {
      return handleApiError(error, 'getStanceChanges');
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear specific cache entry
  clearCacheEntry(key: string): void {
    this.cache.delete(key);
  }

  // Get cache statistics
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    if (this.cache.size === 0) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const entries = Array.from(this.cache.entries());
    const timestamps = entries.map(([_, value]) => value.timestamp);
    
    return {
      totalEntries: this.cache.size,
      totalSize: entries.reduce((sum, [_, value]) => sum + JSON.stringify(value.data).length, 0),
      oldestEntry: new Date(Math.min(...timestamps)).toISOString(),
      newestEntry: new Date(Math.max(...timestamps)).toISOString()
    };
  }
}

// Export singleton instance
export const politicianApiService = new PoliticianApiService();
export default politicianApiService;
