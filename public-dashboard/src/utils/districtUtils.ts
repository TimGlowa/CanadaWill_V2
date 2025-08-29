/**
 * Utility functions for computing district information with fallbacks
 */

export interface DistrictData {
  district?: string;
  electoralDistrict?: string;
  constituency?: string;
  byElection?: boolean;
  isByElectionCandidate?: boolean;
}

/**
 * Compute district with safe fallbacks
 * If marked as by-election, forces "Battle River-Crowfoot"
 * Otherwise uses fallback chain: district -> electoralDistrict -> constituency -> 'N/A'
 */
export function computeDistrict(data: DistrictData): string {
  // If marked as by-election, force "Battle River-Crowfoot"
  if (data.byElection === true || data.isByElectionCandidate === true) {
    return 'Battle River-Crowfoot';
  }
  
  // Otherwise, use fallback chain
  return data.district ?? data.electoralDistrict ?? data.constituency ?? 'N/A';
}

/**
 * Compute district for an official object (used in ResultsGrid and ResultsCard)
 */
export function computeOfficialDistrict(official: any): string {
  return computeDistrict({
    district: official.district_name,
    electoralDistrict: official.electoralDistrict,
    constituency: official.constituency,
    byElection: official.byElection,
    isByElectionCandidate: official.isByElectionCandidate
  });
} 