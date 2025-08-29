import React from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import StanceBadge, { PublicStance } from './StanceBadge';

interface StanceFilterProps {
  selectedStances: PublicStance[];
  onStanceToggle: (stance: PublicStance) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
  counts?: Record<PublicStance, number>;
  className?: string;
}

const allStances: PublicStance[] = ['Pro Canada', 'Pro Separation', 'No Position'];

const StanceFilter: React.FC<StanceFilterProps> = ({
  selectedStances,
  onStanceToggle,
  onClearAll,
  onSelectAll,
  counts,
  className = '',
}) => {
  const isAllSelected = selectedStances.length === allStances.length;
  const isNoneSelected = selectedStances.length === 0;
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Filter by Stance
          </h3>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={onSelectAll}
            disabled={isAllSelected}
            className={`
              px-2 py-1 rounded transition-colors
              ${isAllSelected 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              }
            `}
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={onClearAll}
            disabled={isNoneSelected}
            className={`
              px-2 py-1 rounded transition-colors
              ${isNoneSelected 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              }
            `}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Stance Options */}
      <div className="space-y-2">
        {allStances.map((stance) => {
          const isSelected = selectedStances.includes(stance);
          const count = counts?.[stance];
          
          return (
            <label
              key={stance}
              className={`
                flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                ${isSelected 
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onStanceToggle(stance)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                
                {/* Stance Badge */}
                <StanceBadge 
                  stance={stance} 
                  showTooltip={false}
                  size="sm"
                />
              </div>
              
              {/* Count */}
              {count !== undefined && (
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${isSelected 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {count}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Selected Summary */}
      {!isNoneSelected && !isAllSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Showing {selectedStances.length} of {allStances.length} stance categories
          </p>
        </div>
      )}
    </div>
  );
};

export default StanceFilter; 