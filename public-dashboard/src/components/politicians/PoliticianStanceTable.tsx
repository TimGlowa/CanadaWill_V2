import React from 'react';
import { PublicStance } from './StanceBadge';
import { formatDateForTable, formatDateForTooltip } from '../../utils/dateUtils';
import { computeDistrict } from '../../utils/districtUtils';

// Reuse the existing Politician interface from PoliticianCard
export interface Politician {
  id: string;
  name: string;
  office: string;
  party?: string;
  district: string;
  level: 'federal' | 'provincial' | 'municipal';
  stance: PublicStance;
  reElectionStatus?: 'yes' | 'no' | 'undecided' | 'no_response';
  badgeEligible?: boolean;
  confidence?: number;
  lastUpdated?: string;
  email?: string;
  website?: string;
  statements?: {
    text: string;
    source: string;
    date: string;
  }[];
  isCandidate?: boolean; // Added for candidate status
}

// Props interface for the PoliticianStanceTable component
export interface PoliticianStanceTableProps {
  /** Array of politician data to display in the table */
  politicians: Politician[];
  /** Optional loading state */
  loading?: boolean;
  /** Optional empty state message */
  emptyMessage?: string;
  /** Optional CSS class name for additional styling */
  className?: string;
  /** Whether to show the re-election status column */
  showReElectionStatus?: boolean;
  /** Whether to show the confidence column */
  showConfidence?: boolean;
  /** Whether to show the badge eligibility column */
  showBadgeEligibility?: boolean;
  /** Whether to show candidate/incumbent distinction */
  showCandidateStatus?: boolean;
  /** Whether to show the last updated column */
  showLastUpdated?: boolean;
}

const PoliticianStanceTable: React.FC<PoliticianStanceTableProps> = ({
  politicians,
  loading = false,
  emptyMessage = 'No politicians found',
  className = '',
  showReElectionStatus = true,
  showConfidence = false,
  showBadgeEligibility = false,
  showCandidateStatus = true,
  showLastUpdated = false,
}) => {
  // Helper function to get level color classes
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'federal':
        return 'bg-blue-100 text-blue-800';
      case 'provincial':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get re-election status color and label
  const getReElectionStatusInfo = (status?: string, isCandidate?: boolean) => {
    if (isCandidate) {
      return { color: 'text-blue-600 bg-blue-50', label: 'Election Candidate' };
    }
    
    switch (status) {
      case 'yes':
        return { color: 'text-green-600 bg-green-50', label: 'Planning to run for re-election' };
      case 'no':
        return { color: 'text-red-600 bg-red-50', label: 'Not planning to run for re-election' };
      case 'undecided':
        return { color: 'text-yellow-600 bg-yellow-50', label: 'Undecided about re-election' };
      default:
        return { color: 'text-gray-600 bg-gray-50', label: 'No response on re-election plans' };
    }
  };

  // Helper function to get candidate status display
  const getCandidateStatusInfo = (politician: Politician) => {
    if (politician.isCandidate) {
      return { color: 'text-blue-600 bg-blue-50', label: 'Candidate' };
    } else if (politician.reElectionStatus === 'yes') {
      return { color: 'text-green-600 bg-green-50', label: 'Incumbent (Running)' };
    } else {
      return { color: 'text-gray-600 bg-gray-50', label: 'Incumbent' };
    }
  };

  // Helper function to format confidence percentage
  const formatConfidence = (confidence?: number) => {
    if (!confidence) return 'N/A';
    return `${Math.round(confidence)}%`;
  };

  // Helper function to get stance badge color classes
  const getStanceBadgeColor = (stance: PublicStance) => {
    switch (stance) {
      case 'Pro Canada':
        return 'bg-green-100 text-green-800';
      case 'Pro Separation':
        return 'bg-red-100 text-red-800';
      default: // 'No Position'
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`overflow-x-auto mb-4 ${className}`}>
        <div className="min-w-[600px] w-full p-8 text-center text-gray-500">
          Loading politicians...
        </div>
      </div>
    );
  }

  if (politicians.length === 0) {
    return (
      <div className={`overflow-x-auto mb-4 ${className}`}>
        <div className="min-w-[600px] w-full p-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto mb-4 ${className}`}>
      <table className="min-w-[600px] w-full table-auto divide-y divide-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              Name
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              Office
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              Party
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              District
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              Level
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
              Stance
            </th>
            {showCandidateStatus && (
              <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
                Status
              </th>
            )}
            {showReElectionStatus && (
              <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
                Re-election Status
              </th>
            )}
            {showConfidence && (
              <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
                Confidence
              </th>
            )}
            {showBadgeEligibility && (
              <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
                Badge Eligible
              </th>
            )}
            {showLastUpdated && (
              <th className="px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100">
                Last Updated
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {politicians.map((politician, index) => {
            const reElectionInfo = getReElectionStatusInfo(politician.reElectionStatus, politician.isCandidate);
            const candidateStatusInfo = getCandidateStatusInfo(politician);
            
            return (
              <tr 
                key={politician.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {politician.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {politician.office}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {politician.party || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {computeDistrict({
                    district: politician.district,
                    electoralDistrict: (politician as any).electoralDistrict,
                    constituency: (politician as any).constituency,
                    byElection: (politician as any).byElection,
                    isByElectionCandidate: (politician as any).isByElectionCandidate
                  })}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getLevelColor(politician.level)}`}>
                    {politician.level.charAt(0).toUpperCase() + politician.level.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStanceBadgeColor(politician.stance)}`}>
                    {politician.stance}
                  </span>
                </td>
                {showCandidateStatus && (
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${candidateStatusInfo.color}`}>
                      {candidateStatusInfo.label}
                    </span>
                  </td>
                )}
                {showReElectionStatus && (
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${reElectionInfo.color}`}>
                      {reElectionInfo.label}
                    </span>
                  </td>
                )}
                {showConfidence && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatConfidence(politician.confidence)}
                  </td>
                )}
                {showBadgeEligibility && (
                  <td className="px-4 py-3 text-sm">
                    {politician.badgeEligible ? (
                      <span className="inline-block px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
                        Eligible
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">
                        Not Eligible
                      </span>
                    )}
                  </td>
                )}
                {showLastUpdated && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {politician.lastUpdated ? (
                      <span 
                        title={formatDateForTooltip(politician.lastUpdated)}
                        className="cursor-help"
                      >
                        {formatDateForTable(politician.lastUpdated)}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PoliticianStanceTable; 