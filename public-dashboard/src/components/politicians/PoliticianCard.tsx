import React, { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  BuildingOffice2Icon,
  StarIcon,
  CheckBadgeIcon, 
} from '@heroicons/react/24/outline';
import StanceBadge, { PublicStance } from './StanceBadge';
import { formatDate, formatDateForTooltip } from '../../utils/dateUtils';
import DynamicLastUpdated from '../common/DynamicLastUpdated';
import { computeDistrict } from '../../utils/districtUtils';

export interface Politician {
  id: string;
  name: string;
  office: string;
  party?: string;
  district: string;
  level: 'federal' | 'provincial' | 'municipal';
  stance: PublicStance;
  reElectionStatus?: 'yes' | 'no' | 'undecided' | 'no_response';
  reElectionResponseDate?: string;
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

interface PoliticianCardProps {
  politician: Politician;
  showDetails?: boolean;
}

const PoliticianCard: React.FC<PoliticianCardProps> = ({ 
  politician, 
  showDetails = false, 
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);



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

  const getReElectionStatusColor = (status?: string) => {
    switch (status) {
      case 'yes':
        return 'text-green-600 bg-green-50';
      case 'no':
        return 'text-red-600 bg-red-50';
      case 'undecided':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getReElectionLabel = (status?: string) => {
    switch (status) {
      case 'yes':
        return 'Planning to run for re-election';
      case 'no':
        return 'Not planning to run for re-election';
      case 'undecided':
        return 'Undecided about re-election';
      default:
        return 'No response on re-election plans';
    }
  };

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {politician.name}
            </h3>
            {politician.badgeEligible && (
              <CheckBadgeIcon className="h-5 w-5 text-green-600" title="Pro Canada Badge Eligible" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
            <span className="flex items-center space-x-1">
              <BuildingOffice2Icon className="h-4 w-4" />
              <span>{politician.office}</span>
            </span>
            {politician.party && (
              <span className="text-gray-400">•</span>
            )}
            {politician.party && (
              <span>{politician.party}</span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">District:</span>{' '}
            {computeDistrict({
              district: politician.district,
              electoralDistrict: (politician as any).electoralDistrict,
              constituency: (politician as any).constituency,
              byElection: (politician as any).byElection,
              isByElectionCandidate: (politician as any).isByElectionCandidate
            })}
          </div>
        </div>
        
        {/* Stance Badge */}
        <StanceBadge 
          stance={politician.stance}
          size="sm"
          showTooltip={true}
        />
      </div>

      {/* Key Information Row */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Stance on Alberta separation:</span>
            <StanceBadge 
              stance={politician.stance}
              size="sm"
              showTooltip={false}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Planning to run for re-election:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getReElectionStatusColor(politician.reElectionStatus)}`}>
              {getReElectionLabel(politician.reElectionStatus || 'no_response')}
            </span>
          </div>
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getLevelColor(politician.level)}`}>
          {politician.level}
        </span>
        
        {politician.reElectionResponseDate && (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            Responded: {new Date(politician.reElectionResponseDate).toLocaleDateString()}
          </span>
        )}
        
        {politician.confidence && (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium flex items-center space-x-1">
            <StarIcon className="h-3 w-3" />
            <span>{(politician.confidence * 100).toFixed(0)}% confidence</span>
          </span>
        )}
      </div>

      {/* Expandable Details */}
      {(politician.statements && politician.statements.length > 0) && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline mb-3"
          >
            <span>
              {isExpanded ? 'Hide' : 'Show'} recent statements
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-3">
                {politician.statements?.slice(0, 3).map((statement, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 mb-2 italic">
                      "{statement.text}"
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{statement.source}</span>
                      <span>{new Date(statement.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {politician.email || politician.website ? (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {politician.email && (
                      <a 
                        href={`mailto:${politician.email}`}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Email
                      </a>
                    )}
                    {politician.website && (
                      <a 
                        href={politician.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
              
              {politician.lastUpdated && (
                <div className="mt-3">
                  <DynamicLastUpdated 
                    dateString={politician.lastUpdated}
                    showRelative={true}
                    refreshInterval={30000} // 30 seconds
                    showRecentIndicator={true}
                    label="Last updated"
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PoliticianCard; 