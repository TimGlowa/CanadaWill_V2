import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import PoliticianCard, { Politician } from './PoliticianCard';

interface CategorySectionProps {
  stance: 'pro-canada' | 'pro-separation' | 'no-position';
  politicians: Politician[];
  defaultExpanded?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  stance,
  politicians,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getCategoryInfo = (stance: string) => {
    switch (stance) {
      case 'pro-canada':
        return {
          title: 'Pro Canada',
          icon: '🇨🇦',
          color: 'border-green-200 bg-green-50',
          headerColor: 'text-green-800',
          description: 'Politicians who support maintaining Alberta within Canada and working within Confederation.',
          badgeInfo: 'Politicians in this category may be eligible for Pro Canada badges based on their stance strength and consistency.',
        };
      case 'pro-separation':
        return {
          title: 'Pro Separation',
          icon: '🏛️',
          color: 'border-red-200 bg-red-50',
          headerColor: 'text-red-800',
          description: 'Politicians who support or are open to Alberta independence or separation from Canada. This includes those who have declined to comment, as non-response is considered supportive of separation.',
          badgeInfo: 'This category includes both explicit supporters of separation and those who refuse to take a public stance.',
        };
      default:
        return {
          title: 'No Position',
          icon: '❓',
          color: 'border-gray-200 bg-gray-50',
          headerColor: 'text-gray-800',
          description: 'Politicians whose position on Alberta\'s place in Canada is unknown or unclear.',
          badgeInfo: 'These politicians have not provided sufficient public statements to determine their stance.',
        };
    }
  };

  const categoryInfo = getCategoryInfo(stance);
  const hasRunningCandidates = politicians.some(p => p.reElectionStatus === 'running');
  const badgeEligibleCount = politicians.filter(p => p.badgeEligible).length;

  if (politicians.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border-2 ${categoryInfo.color} mb-6`}>
      {/* Header */}
      <div className="p-4 border-b border-current border-opacity-20">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2 -m-2"
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl" aria-hidden="true">
              {categoryInfo.icon}
            </div>
            <div className="text-left">
              <h2 className={`text-xl font-bold ${categoryInfo.headerColor}`}>
                {categoryInfo.title}
                <span className="ml-2 text-sm font-normal opacity-75">
                  ({politicians.length} {politicians.length === 1 ? 'politician' : 'politicians'})
                </span>
              </h2>
              {hasRunningCandidates && (
                <p className="text-sm opacity-75">
                  Includes {politicians.filter(p => p.reElectionStatus === 'running').length} running for re-election
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {badgeEligibleCount > 0 && stance === 'pro-canada' && (
              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                {badgeEligibleCount} Badge Eligible
              </span>
            )}
            {isExpanded ? (
              <ChevronUpIcon className={`h-5 w-5 ${categoryInfo.headerColor}`} />
            ) : (
              <ChevronDownIcon className={`h-5 w-5 ${categoryInfo.headerColor}`} />
            )}
          </div>
        </button>

        {/* Description - Always visible */}
        <div className="mt-3 flex items-start space-x-2">
          <InformationCircleIcon className={`h-5 w-5 ${categoryInfo.headerColor} opacity-60 flex-shrink-0 mt-0.5`} />
          <div className="text-sm opacity-80">
            <p className="mb-1">{categoryInfo.description}</p>
            <p className="text-xs opacity-75">{categoryInfo.badgeInfo}</p>
          </div>
        </div>
      </div>

      {/* Politicians List */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {politicians.map((politician) => (
              <PoliticianCard
                key={politician.id}
                politician={politician}
                showDetails={false}
              />
            ))}
          </div>
          
          {politicians.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No politicians found in this category for your area.</p>
            </div>
          )}
        </div>
      )}

      {/* Summary when collapsed */}
      {!isExpanded && politicians.length > 0 && (
        <div className="p-4 border-t border-current border-opacity-20">
          <div className="flex justify-between items-center text-sm opacity-75">
            <span>
              {politicians.filter(p => p.level === 'federal').length} Federal • {' '}
              {politicians.filter(p => p.level === 'provincial').length} Provincial • {' '}
              {politicians.filter(p => p.level === 'municipal').length} Municipal
            </span>
            <span className="text-xs">
              Click to expand
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySection; 