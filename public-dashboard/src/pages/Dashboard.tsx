import React, { useState } from "react";
import { getOfficials } from "../lib/api";
import SimpleSearch from "../components/search/SimpleSearch";
import ResultsGrid from "../components/search/ResultsGrid";
import { Official } from "../types/officials";
import Logo from "../components/Logo";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  async function onSearch(address: string) {
    setErr(null); setLoading(true); setData(null);
    try {
      const json = await getOfficials(address); // POST /geo-search
      setData(json);
    } catch {
      setErr("Could not fetch officials. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const brc = data?.battle_river_crowfoot || {};
  const byElection = !!brc.found;
  const candidates = Array.isArray(brc.representatives) ? brc.representatives : [];

  const federal = data?.representatives?.federal?.[0] || null;
  const provincials = Array.isArray(data?.representatives?.provincial) ? data.representatives.provincial : [];
  const municipals  = Array.isArray(data?.representatives?.municipal)  ? data.representatives.municipal  : [];
  const mayor       = municipals[0] || null;
  const councillor  = municipals[1] || null;

  // Create Premier data object for Danielle Smith
  const premierData = {
    id: 'premier-danielle-smith',
    name: 'Danielle Smith',
    first_name: 'Danielle',
    last_name: 'Smith',
    party: 'United Conservative Party (UCP)',
    district_name: 'Brooks-Medicine Hat',
    level: 'Premier',
    stance: 'Stance TBD',
    running_next_election: undefined,
    email: 'premier@gov.ab.ca',
    byElection: false,
    isByElectionCandidate: false
  };

  // Transform data for the new card layout
  const transformOfficials = (officials: any[], level: Official['level']): Official[] => {
    return officials.map((official: any) => ({
      id: official.id,
      name: official.name,
      first_name: official.first_name,
      last_name: official.last_name,
      party: official.party_name || official.party, // Map party_name to party
      district_name: official.district_name,
      level: official.level === 'Premier' ? 'Premier' : level, // Preserve Premier level
      stance: "Stance TBD",
      running_next_election: undefined, // Will show as "TBD"
      email: official.email,
      // Preserve by-election fields for district computation
      byElection: official.byElection,
      isByElectionCandidate: official.isByElectionCandidate
    }));
  };

  const federalOfficials = federal ? transformOfficials([federal], 'MP') : [];
  
  // Add Premier to provincial officials and then transform
  const provincialWithPremier = [premierData, ...provincials];
  const provincialOfficials = transformOfficials(provincialWithPremier, 'MLA');
  
  const municipalOfficials = transformOfficials(municipals, 'Councillor');
  
  // Add mayor with correct level
  if (mayor) {
    municipalOfficials.unshift({
      ...transformOfficials([mayor], 'Mayor')[0],
      level: 'Mayor'
    });
  }

  // Add candidates if by-election
  const candidateOfficials = byElection ? transformOfficials(candidates, 'Candidate') : [];

  return (
    <div>
      <header className="bg-white py-4 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center px-4">
          <Logo className="h-10 w-auto" />
        </div>
      </header>

      <section className="bg-white py-12">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Expose Politicians Who Enable Separatism
          </h1>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            Alberta's separatist movement is growing because politicians won't speak out against their dangerous agenda that threatens our jobs, security, and way of life—so we're ending their silence by demanding public answers.
          </p>
          <p className="text-base text-gray-600 italic mb-8">
            Enter your address to see where your local, provincial and federal elected representatives stand on Alberta separation.
          </p>
          {/* Single search bar */}
          <div className="max-w-xl mx-auto">
            <SimpleSearch onSearch={onSearch} />
          </div>
        </div>
      </section>

      {/* Results section with responsive card grid */}
      {loading && (
        <div className="max-w-6xl mx-auto p-4 text-center">
          <div className="text-lg text-gray-600">Loading officials...</div>
        </div>
      )}
      
      {err && (
        <div className="max-w-6xl mx-auto p-4 text-center">
          <div className="text-lg text-red-600">{err}</div>
        </div>
      )}

      {data && (
        <div className="max-w-6xl mx-auto p-4 space-y-8">
          {/* By-election info */}
          {byElection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">By-Election Active</h2>
              <p className="text-blue-800">
                Battle River–Crowfoot is holding a by-election with {candidates.length} candidate{candidates.length > 1 ? 's' : ''}. We're keeping it simple by focusing on the key players and skipping the long-ballot candidates.
              </p>
            </div>
          )}

          {/* Federal Representatives */}
          <ResultsGrid 
            officials={federalOfficials} 
            title="Federal Representatives" 
          />

          {/* Provincial Representatives */}
          <ResultsGrid 
            officials={provincialOfficials} 
            title="Provincial Representatives" 
          />

          {/* Municipal Representatives */}
          <ResultsGrid 
            officials={municipalOfficials} 
            title="Municipal Representatives" 
          />

          {/* Candidates (if by-election) */}
          {candidateOfficials.length > 0 && (
            <ResultsGrid 
              officials={candidateOfficials} 
              title="By-Election Candidates" 
            />
          )}
        </div>
      )}
    </div>
  );
} 