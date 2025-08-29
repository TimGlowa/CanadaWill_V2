export interface Official {
  id?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  party?: string;
  party_name?: string; // Add party_name field for backend compatibility
  district_name?: string;
  level: 'MP' | 'MLA' | 'Mayor' | 'Councillor' | 'Candidate' | 'Premier';
  stance?: string;
  running_next_election?: boolean;
  email?: string;
  byElection?: boolean;
  isByElectionCandidate?: boolean;
}

export interface SearchResults {
  representatives?: {
    federal?: Official[];
    provincial?: Official[];
    municipal?: Official[];
  };
  battle_river_crowfoot?: {
    found: boolean;
    representatives?: Official[];
  };
}

export interface SearchResponse {
  data: SearchResults;
  loading: boolean;
  error: string | null;
} 