import { Politician } from '../components/politicians/PoliticianCard';

// Types for Represent API responses
interface RepresentOfficial {
  name: string;
  elected_office: string;
  party_name?: string;
  district_name: string;
  email?: string;
  url?: string;
  offices: Array<{
    type: 'legislature' | 'office';
    postal?: string;
  }>;
}

interface RepresentCandidate {
  name: string;
  elected_office: string;
  party_name?: string;
  district_name: string;
  email?: string;
  url?: string;
}

interface PostalCodeResponse {
  representatives_centroid: RepresentOfficial[];
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
}

// Enhanced candidate interface
interface CandidateData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  role: string;
  town: string;
  party: string;
  website?: string;
  riding: string;
  level: 'federal' | 'provincial' | 'municipal';
  isIncumbent: boolean;
  incumbentName?: string;
}

// Enhanced mayor interface
interface MayorData {
  id: string;
  name: string;
  city: string;
  province: string;
  email?: string;
  phone?: string;
  website?: string;
  termStart: string;
  termEnd: string;
  postalCodes: string[];
}

interface MayorLookupResult {
  mayor?: MayorData;
  city: string;
  province: string;
  found: boolean;
  source: 'local' | 'represent_api' | 'not_found';
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Configuration
const REPRESENT_API_BASE = 'https://represent.opennorth.ca';
const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://canadawill-api2-fberbsa2dhffdmd4.canadacentral-01.azurewebsites.net/api/v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_DELAY = 100; // Rate limiting delay in ms

class RepresentApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private lastRequestTime = 0;

  // Rate limiting helper
  private async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

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

  // Enhanced candidate lookup from backend
  async getCandidatesByRiding(riding: string, level: 'federal' | 'provincial' | 'municipal' = 'federal'): Promise<CandidateData[]> {
    const cacheKey = `candidates_riding_${riding}_${level}`;
    const cached = this.getCachedData<CandidateData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/candidates/${encodeURIComponent(riding)}?level=${level}`);
      
      if (!response.ok) {
        console.warn('Candidate lookup failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const candidates = data.data?.candidates || [];
      
      this.setCachedData(cacheKey, candidates);
      return candidates;
    } catch (error) {
      console.warn('Candidate lookup error:', error);
      return [];
    }
  }

  // Get candidates by coordinates (NEW - RECOMMENDED approach)
  async getCandidatesByCoordinates(latitude: number, longitude: number): Promise<CandidateData[]> {
    const cacheKey = `candidates_coords_${latitude}_${longitude}`;
    const cached = this.getCachedData<CandidateData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/candidates/coordinates/${latitude}/${longitude}`);
      
      if (!response.ok) {
        console.warn('Coordinates candidate lookup failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const candidates = data.data?.candidates || [];
      
      this.setCachedData(cacheKey, candidates);
      return candidates;
    } catch (error) {
      console.warn('Coordinates candidate lookup error:', error);
      return [];
    }
  }

  async getCandidatesByPostalCode(postalCode: string): Promise<CandidateData[]> {
    const cacheKey = `candidates_postal_${postalCode}`;
    const cached = this.getCachedData<CandidateData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/candidates/postal-code/${encodeURIComponent(postalCode)}`);
      
      if (!response.ok) {
        console.warn('Postal code candidate lookup failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const candidates = data.data?.candidates || [];
      
      this.setCachedData(cacheKey, candidates);
      return candidates;
    } catch (error) {
      console.warn('Postal code candidate lookup error:', error);
      return [];
    }
  }

  // Geocoding service - convert address to coordinates
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    const cacheKey = `geocode_${address}`;
    const cached = this.getCachedData<GeocodingResult>(cacheKey);
    if (cached) return cached;

    // Using a simple geocoding service (in production, you might use Google Maps API, MapBox, etc.)
    try {
      // For demo purposes, using Nominatim (OpenStreetMap's geocoding service)
      await this.rateLimitDelay();
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&limit=1&q=${encodeURIComponent(address)}`,
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }
      
      const results = await response.json();
      
      if (!results || results.length === 0) {
        throw new Error('Address not found');
      }
      
      const result: GeocodingResult = {
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
        address: results[0].display_name,
      };
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Unable to find coordinates for this address');
    }
  }

  // Convert postal code to coordinates using Represent API
  async geocodePostalCode(postalCode: string): Promise<GeocodingResult> {
    const cleanPostalCode = postalCode.replace(/\s/g, '').toUpperCase();
    const cacheKey = `geocode_postal_${cleanPostalCode}`;
    const cached = this.getCachedData<GeocodingResult>(cacheKey);
    if (cached) return cached;

    try {
      await this.rateLimitDelay();
      
      const response = await fetch(
        `${REPRESENT_API_BASE}/postcodes/${cleanPostalCode}/`,
      );
      
      if (!response.ok) {
        throw new Error(`Postal code lookup failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.centroid || !data.centroid.coordinates) {
        throw new Error('Postal code not found or invalid');
      }
      
      const [longitude, latitude] = data.centroid.coordinates;
      const result: GeocodingResult = {
        latitude,
        longitude,
        address: `${postalCode}, Canada`,
      };
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Postal code geocoding error:', error);
      throw new Error('Unable to find coordinates for this postal code');
    }
  }

  // Get elected officials by coordinates
  async getElectedOfficials(latitude: number, longitude: number): Promise<RepresentOfficial[]> {
    const cacheKey = `officials_${latitude}_${longitude}`;
    const cached = this.getCachedData<RepresentOfficial[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.rateLimitDelay();
      
      const response = await fetch(
        `${REPRESENT_API_BASE}/representatives/?point=${latitude},${longitude}`,
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const officials = data.objects || [];
      
      this.setCachedData(cacheKey, officials);
      return officials;
    } catch (error) {
      console.error('Elected officials lookup error:', error);
      throw new Error('Unable to fetch elected officials for this location');
    }
  }

  // Get candidates by coordinates (may be incomplete)
  async getCandidates(latitude: number, longitude: number): Promise<RepresentCandidate[]> {
    const cacheKey = `candidates_${latitude}_${longitude}`;
    const cached = this.getCachedData<RepresentCandidate[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.rateLimitDelay();
      
      const response = await fetch(
        `${REPRESENT_API_BASE}/candidates/?point=${latitude},${longitude}`,
      );
      
      if (!response.ok) {
        // Candidates endpoint might not be available or have data
        console.warn('Candidates API request failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const candidates = data.objects || [];
      
      this.setCachedData(cacheKey, candidates);
      return candidates;
    } catch (error) {
      console.warn('Candidates lookup error:', error);
      return []; // Non-critical failure
    }
  }

  // Fallback: Get representatives by postal code (less accurate)
  async getRepresentativesByPostalCode(postalCode: string): Promise<RepresentOfficial[]> {
    const cleanPostalCode = postalCode.replace(/\s/g, '').toUpperCase();
    const cacheKey = `postal_officials_${cleanPostalCode}`;
    const cached = this.getCachedData<RepresentOfficial[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.rateLimitDelay();
      
      const response = await fetch(
        `${REPRESENT_API_BASE}/postcodes/${cleanPostalCode}/`,
      );
      
      if (!response.ok) {
        throw new Error(`Postal code lookup failed: ${response.statusText}`);
      }
      
      const data: PostalCodeResponse = await response.json();
      const officials = data.representatives_centroid || [];
      
      this.setCachedData(cacheKey, officials);
      return officials;
    } catch (error) {
      console.error('Postal code representatives lookup error:', error);
      throw new Error('Unable to fetch representatives for this postal code');
    }
  }

  // Enhanced mayor lookup from backend
  async getMayorByPostalCode(postalCode: string): Promise<MayorLookupResult> {
    const cacheKey = `mayor_postal_${postalCode}`;
    const cached = this.getCachedData<MayorLookupResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/mayors/postal-code/${encodeURIComponent(postalCode)}`);
      
      if (!response.ok) {
        console.warn('Mayor lookup failed:', response.statusText);
        return {
          found: false,
          source: 'not_found',
          postalCode,
          city: 'Unknown',
          province: 'Alberta'
        };
      }
      
      const data = await response.json();
      const result = data.data;
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Mayor lookup error:', error);
      return {
        found: false,
        source: 'not_found',
        postalCode,
        city: 'Unknown',
        province: 'Alberta'
      };
    }
  }

  // Get mayor by city name
  async getMayorByCity(cityName: string): Promise<MayorLookupResult> {
    const cacheKey = `mayor_city_${cityName}`;
    const cached = this.getCachedData<MayorLookupResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/mayors/city/${encodeURIComponent(cityName)}`);
      
      if (!response.ok) {
        console.warn('City mayor lookup failed:', response.statusText);
        return {
          found: false,
          source: 'not_found',
          postalCode: 'Unknown',
          city: cityName,
          province: 'Alberta'
        };
      }
      
      const data = await response.json();
      const result = data.data;
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('City mayor lookup error:', error);
      return {
        found: false,
        source: 'not_found',
        postalCode: 'Unknown',
        city: cityName,
        province: 'Alberta'
      };
    }
  }

  // Get mayor by coordinates (NEW - RECOMMENDED approach)
  async getMayorByCoordinates(latitude: number, longitude: number): Promise<MayorLookupResult> {
    const cacheKey = `mayor_coords_${latitude}_${longitude}`;
    const cached = this.getCachedData<MayorLookupResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/mayors/coordinates/${latitude}/${longitude}`);
      
      if (!response.ok) {
        console.warn('Coordinates mayor lookup failed:', response.statusText);
        return {
          found: false,
          source: 'not_found',
          postalCode: 'Unknown',
          city: 'Unknown',
          province: 'Alberta'
        };
      }
      
      const data = await response.json();
      const result = data.data;
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Coordinates mayor lookup error:', error);
      return {
        found: false,
        source: 'not_found',
        postalCode: 'Unknown',
        city: 'Unknown',
        province: 'Alberta'
      };
    }
  }

  // Get all mayors
  async getAllMayors(): Promise<MayorData[]> {
    const cacheKey = 'all_mayors';
    const cached = this.getCachedData<MayorData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/mayors`);
      
      if (!response.ok) {
        console.warn('All mayors lookup failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const mayors = data.data?.mayors || [];
      
      this.setCachedData(cacheKey, mayors);
      return mayors;
    } catch (error) {
      console.warn('All mayors lookup error:', error);
      return [];
    }
  }

  // Helper function to compute district with safe fallbacks
  private computeDistrict(
    district?: string,
    electoralDistrict?: string,
    constituency?: string,
    byElection?: boolean,
    isByElectionCandidate?: boolean
  ): string {
    // If marked as by-election, force "Battle River-Crowfoot"
    if (byElection === true || isByElectionCandidate === true) {
      return 'Battle River-Crowfoot';
    }
    
    // Otherwise, use fallback chain
    return district ?? electoralDistrict ?? constituency ?? 'N/A';
  }

  // Convert candidate data to internal Politician format
  private mapCandidateToPolitician(candidate: CandidateData): Politician {
    return {
      id: candidate.id,
      name: candidate.fullName,
      office: candidate.role,
      party: candidate.party,
      district: this.computeDistrict(
        candidate.riding,
        (candidate as any).electoralDistrict,
        (candidate as any).constituency,
        (candidate as any).byElection,
        (candidate as any).isByElectionCandidate
      ),
      level: candidate.level,
      stance: 'No Position', // Default - will be updated by backend integration
      reElectionStatus: candidate.isIncumbent ? 'yes' : 'no_response',
      email: candidate.email,
      website: candidate.website,
      isCandidate: true,
    };
  }

  // Convert Represent API data to internal Politician format
  private mapToPolitician(official: RepresentOfficial | RepresentCandidate, isCandidate = false): Politician {
    // Determine government level from elected office
    const office = official.elected_office.toLowerCase();
    let level: 'federal' | 'provincial' | 'municipal' = 'municipal';
    
    if (office.includes('mp') || office.includes('member of parliament') || office.includes('senator')) {
      level = 'federal';
    } else if (office.includes('mla') || office.includes('premier') || office.includes('cabinet') || 
               office.includes('legislative assembly') || office.includes('provincial')) {
      level = 'provincial';
    }

    return {
      id: `${official.name.replace(/\s+/g, '-').toLowerCase()}-${official.district_name.replace(/\s+/g, '-').toLowerCase()}`,
      name: official.name,
      office: official.elected_office,
      party: official.party_name,
      district: this.computeDistrict(
        official.district_name,
        (official as any).electoralDistrict,
        (official as any).constituency,
        (official as any).byElection,
        (official as any).isByElectionCandidate
      ),
      level,
      stance: 'No Position', // Default - will be updated by backend integration
      reElectionStatus: isCandidate ? 'yes' : 'no_response',
      email: official.email,
      website: official.url,
      isCandidate,
    };
  }

  // Convert mayor data to internal Politician format
  private mapMayorToPolitician(mayor: MayorData): Politician {
    return {
      id: mayor.id,
      name: mayor.name,
      office: 'Mayor',
      party: undefined, // Mayors are typically non-partisan
      district: mayor.city,
      level: 'municipal',
      stance: 'No Position', // Default - will be updated by backend integration
      reElectionStatus: 'no_response',
      email: mayor.email,
      website: mayor.website,
      isCandidate: false, // Mayors are current officials
    };
  }

  // Check if a district name is Battle River-Crowfoot (federal level)
  private isBattleRiverCrowfootDistrict(districtName: string): boolean {
    if (!districtName) return false;
    
    const cleanDistrictName = districtName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check for various spellings of Battle River-Crowfoot
    const battleRiverVariations = [
      'battlerivercrowfoot',
      'battleriver-crowfoot', 
      'battle river crowfoot',
      'battle river-crowfoot',
      'battleriver crowfoot',
      'battle rivercrowfoot'
    ];
    
    return battleRiverVariations.some(variation => 
      cleanDistrictName.includes(variation) || variation.includes(cleanDistrictName)
    );
  }

  // Enhanced main search method that includes candidate data
  async searchPoliticians(query: string, type: 'address' | 'postal'): Promise<Politician[]> {
    try {
      console.log(`🔍 Starting search for: ${query} (type: ${type})`);
      
      let coordinates: GeocodingResult;
      
      // Step 1: Get coordinates
      if (type === 'postal') {
        // Try direct postal code geocoding first
        try {
          coordinates = await this.geocodePostalCode(query);
          console.log(`📍 Geocoded postal code ${query} to coordinates:`, coordinates);
        } catch (error) {
          // Fallback to regular geocoding
          console.log(`⚠️ Postal code geocoding failed, trying address geocoding:`, error);
          coordinates = await this.geocodeAddress(query);
        }
      } else {
        coordinates = await this.geocodeAddress(query);
        console.log(`📍 Geocoded address ${query} to coordinates:`, coordinates);
      }

      // Step 2: Get officials, candidates, enhanced candidate data, and mayor data
      console.log(`🔄 Fetching data from multiple sources...`);
      const [officials, candidates, enhancedCandidates, mayorResult] = await Promise.all([
        this.getElectedOfficials(coordinates.latitude, coordinates.longitude),
        this.getCandidates(coordinates.latitude, coordinates.longitude),
        this.getCandidatesByCoordinates(coordinates.latitude, coordinates.longitude), // Enhanced candidate data from backend
        this.getMayorByPostalCode(query), // Mayor data from backend (still using postal code for now)
      ]);

      console.log(`📊 Raw data counts:`);
      console.log(`  - Officials from Represent API: ${officials.length}`);
      console.log(`  - Candidates from Represent API: ${candidates.length}`);
      console.log(`  - Enhanced candidates from backend: ${enhancedCandidates.length}`);
      console.log(`  - Mayor found: ${mayorResult.found ? 'Yes' : 'No'}`);

      // Step 3: Convert to internal format
      const politicians: Politician[] = [
        ...officials.map(official => this.mapToPolitician(official, false)),
        ...candidates.map(candidate => this.mapToPolitician(candidate, true)),
        ...enhancedCandidates.map(candidate => this.mapCandidateToPolitician(candidate)),
      ];

      console.log(`🔄 Converted to politicians: ${politicians.length} total`);

      // Add mayor if found
      if (mayorResult.found && mayorResult.mayor) {
        politicians.push(this.mapMayorToPolitician(mayorResult.mayor));
        console.log(`👤 Added mayor: ${mayorResult.mayor.name}`);
      }

      // Step 4: Check for Battle River-Crowfoot federal district and add by-election candidates
      const federalOfficials = officials.filter(official => 
        official.elected_office.toLowerCase().includes('member of parliament') ||
        official.elected_office.toLowerCase().includes('mp')
      );
      
      console.log(`🏛️ Checking federal officials for Battle River-Crowfoot district...`);
      console.log(`📋 Federal officials found:`, federalOfficials.map(o => `${o.name} (${o.elected_office}, ${o.district_name})`));
      
      const battleRiverFederalOfficial = federalOfficials.find(official => 
        this.isBattleRiverCrowfootDistrict(official.district_name)
      );
      
      if (battleRiverFederalOfficial) {
        console.log(`🏛️ Found Battle River-Crowfoot federal official: ${battleRiverFederalOfficial.name} (${battleRiverFederalOfficial.district_name})`);
        console.log(`🏛️ This is a by-election riding - fetching by-election candidates...`);
        
        try {
          const byElectionCandidates = await this.getByElectionCandidates();
          console.log(`📋 Found ${byElectionCandidates.length} by-election candidates:`, byElectionCandidates.map(c => c.name));
          
          // Add by-election candidates with proper formatting
          const formattedByElectionCandidates = byElectionCandidates.map(candidate => ({
            ...candidate,
            level: 'federal' as const,
            isCandidate: true,
            reElectionStatus: 'yes' as const,
            lastUpdated: new Date().toISOString().split('T')[0],
            isFromLocalDatabase: true,
            isFromRepresentApi: false,
            // Add by-election specific metadata
            byElectionInfo: {
              riding: 'Battle River-Crowfoot',
              level: 'federal',
              byElectionDate: '2025-10-20',
              isByElectionCandidate: true
            }
          }));
          
          console.log(`✅ Added ${formattedByElectionCandidates.length} formatted by-election candidates`);
          politicians.push(...formattedByElectionCandidates);
        } catch (error) {
          console.warn('❌ Failed to fetch by-election candidates:', error);
        }
      } else {
        console.log(`ℹ️ No Battle River-Crowfoot federal district found in officials`);
      }

      // Step 5: Remove duplicates (officials who are also candidates)
      const uniquePoliticians = politicians.filter((politician, index, array) => 
        array.findIndex(p => p.name === politician.name && p.district === politician.district) === index,
      );

      console.log(`🎯 Final unique politicians count: ${uniquePoliticians.length}`);
      console.log(`📋 Final politicians:`, uniquePoliticians.map(p => `${p.name} (${p.level}, ${p.district})`));

      return uniquePoliticians;

    } catch (error) {
      console.error('❌ Search politicians error:', error);
      
      // Fallback for postal codes
      if (type === 'postal') {
        try {
          console.log(`🔄 Trying fallback search for postal code: ${query}`);
          
          // First, get coordinates for the postal code
          let fallbackCoordinates: GeocodingResult;
          try {
            fallbackCoordinates = await this.geocodePostalCode(query);
            console.log(`📍 Fallback geocoded postal code ${query} to coordinates:`, fallbackCoordinates);
          } catch (geocodeError) {
            console.warn('❌ Fallback geocoding failed, using postal code endpoints:', geocodeError);
            // Use postal code endpoints as last resort
            const officials = await this.getRepresentativesByPostalCode(query);
            const enhancedCandidates = await this.getCandidatesByPostalCode(query);
            const mayorResult = await this.getMayorByPostalCode(query);
            
            console.log(`📊 Fallback data counts:`);
            console.log(`  - Officials: ${officials.length}`);
            console.log(`  - Enhanced candidates: ${enhancedCandidates.length}`);
            
            const politicians: Politician[] = [
              ...officials.map(official => this.mapToPolitician(official, false)),
              ...enhancedCandidates.map(candidate => this.mapCandidateToPolitician(candidate)),
            ];

            // Add mayor if found
            if (mayorResult.found && mayorResult.mayor) {
              politicians.push(this.mapMayorToPolitician(mayorResult.mayor));
              console.log(`👤 Added mayor in fallback: ${mayorResult.mayor.name}`);
            }

            console.log(`🎯 Fallback final politicians count: ${politicians.length}`);
            return politicians;
          }
          
          // Use coordinates-based endpoints for fallback
          const [officials, candidates, enhancedCandidates, mayorResult] = await Promise.all([
            this.getElectedOfficials(fallbackCoordinates.latitude, fallbackCoordinates.longitude),
            this.getCandidates(fallbackCoordinates.latitude, fallbackCoordinates.longitude),
            this.getCandidatesByCoordinates(fallbackCoordinates.latitude, fallbackCoordinates.longitude),
            this.getMayorByPostalCode(query), // Mayor data from backend (still using postal code for now)
          ]);
          
          console.log(`📊 Fallback data counts:`);
          console.log(`  - Officials: ${officials.length}`);
          console.log(`  - Candidates: ${candidates.length}`);
          console.log(`  - Enhanced candidates: ${enhancedCandidates.length}`);
          
          const politicians: Politician[] = [
            ...officials.map(official => this.mapToPolitician(official, false)),
            ...candidates.map(candidate => this.mapToPolitician(candidate, true)),
            ...enhancedCandidates.map(candidate => this.mapCandidateToPolitician(candidate)),
          ];

          // Add mayor if found
          if (mayorResult.found && mayorResult.mayor) {
            politicians.push(this.mapMayorToPolitician(mayorResult.mayor));
            console.log(`👤 Added mayor in fallback: ${mayorResult.mayor.name}`);
          }

          // Add by-election candidates for Battle River-Crowfoot
          const federalFallbackOfficials = officials.filter(official => 
            official.elected_office.toLowerCase().includes('member of parliament') ||
            official.elected_office.toLowerCase().includes('mp')
          );
          
          console.log(`🏛️ Checking fallback federal officials for Battle River-Crowfoot district...`);
          console.log(`📋 Fallback federal officials found:`, federalFallbackOfficials.map(o => `${o.name} (${o.elected_office}, ${o.district_name})`));
          
          const battleRiverFallbackOfficial = federalFallbackOfficials.find(official => 
            this.isBattleRiverCrowfootDistrict(official.district_name)
          );
          
          if (battleRiverFallbackOfficial) {
            console.log(`🏛️ Found Battle River-Crowfoot federal official in fallback: ${battleRiverFallbackOfficial.name} (${battleRiverFallbackOfficial.district_name})`);
            console.log(`🏛️ This is a by-election riding - fetching by-election candidates...`);
            
            try {
              console.log(`🏛️ Detected Battle River-Crowfoot federal district in fallback, fetching by-election candidates...`);
              const byElectionCandidates = await this.getByElectionCandidates();
              console.log(`📋 Found ${byElectionCandidates.length} by-election candidates in fallback:`, byElectionCandidates.map(c => c.name));
              
              // Add by-election candidates with proper formatting
              const formattedByElectionCandidates = byElectionCandidates.map(candidate => ({
                ...candidate,
                level: 'federal' as const,
                isCandidate: true,
                reElectionStatus: 'yes' as const,
                lastUpdated: new Date().toISOString().split('T')[0],
                isFromLocalDatabase: true,
                isFromRepresentApi: false,
                // Add by-election specific metadata
                byElectionInfo: {
                  riding: 'Battle River-Crowfoot',
                  level: 'federal',
                  byElectionDate: '2025-10-20',
                  isByElectionCandidate: true
                }
              }));
              
              console.log(`✅ Added ${formattedByElectionCandidates.length} formatted by-election candidates in fallback`);
              politicians.push(...formattedByElectionCandidates);
            } catch (error) {
              console.warn('❌ Failed to fetch by-election candidates in fallback:', error);
            }
          } else {
            console.log(`ℹ️ No Battle River-Crowfoot federal district found in fallback officials`);
          }
          
          console.log(`🎯 Fallback final politicians count: ${politicians.length}`);
          return politicians;
        } catch (fallbackError) {
          console.error('❌ Fallback search failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  // Get by-election candidates for Battle River-Crowfoot
  private async getByElectionCandidates(): Promise<Politician[]> {
    const cacheKey = 'by_election_candidates_battle_river_crowfoot';
    const cached = this.getCachedData<Politician[]>(cacheKey);
    if (cached) {
      console.log(`📋 Using cached by-election candidates: ${cached.length} candidates`);
      return cached;
    }

    console.log(`🔄 Fetching by-election candidates from backend API...`);
    console.log(`🌐 API URL: ${BACKEND_API_BASE}/politicians/by-election/battle-river-crowfoot`);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE}/politicians/by-election/battle-river-crowfoot`);
      
      console.log(`📡 Backend API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.warn(`❌ By-election candidates lookup failed: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`📊 Backend API response data:`, data);
      
      const candidates = data.data?.candidates || [];
      console.log(`📋 Extracted ${candidates.length} candidates from response`);
      
      if (candidates.length > 0) {
        console.log(`📋 Candidate names:`, candidates.map((c: any) => c.name || c.fullName));
      }
      
      this.setCachedData(cacheKey, candidates);
      return candidates;
    } catch (error) {
      console.warn(`❌ By-election candidates lookup error:`, error);
      return [];
    }
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const representApi = new RepresentApiService();
export default representApi; 