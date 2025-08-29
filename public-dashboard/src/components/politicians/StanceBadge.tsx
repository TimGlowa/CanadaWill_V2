import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export type PublicStance = 'Pro Canada' | 'Pro Separation' | 'No Position';

interface StanceBadgeProps {
  stance: PublicStance;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StanceBadge: React.FC<StanceBadgeProps> = ({ 
  stance, 
  showTooltip = true, 
  size = 'md',
  className = '',
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const getStanceStyles = (stance: PublicStance) => {
    switch (stance) {
      case 'Pro Canada':
        return {
          badge: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
          dot: 'bg-green-500',
        };
      case 'Pro Separation':
        return {
          badge: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100',
          dot: 'bg-red-500',
        };
      default: // 'No Position'
        return {
          badge: 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100',
          dot: 'bg-gray-500',
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default: // 'md'
        return 'px-3 py-1 text-sm';
    }
  };

  const getTooltipContent = (stance: PublicStance) => {
    switch (stance) {
      case 'Pro Canada':
        return {
          title: 'Pro Canada',
          content: 'Politician has explicitly stated opposition to Alberta separation and commitment to Canadian unity.',
        };
      case 'Pro Separation':
        return {
          title: 'Pro Separation',
          content: 'Politician either supports Alberta separation OR has refused to answer questions about their stance (grouped together as they do not oppose separation).',
        };
      default: // 'No Position'
        return {
          title: 'No Position',
          content: 'No public statements or data found regarding this politician\'s stance on Alberta separation.',
        };
    }
  };

  const styles = getStanceStyles(stance);
  const sizeClasses = getSizeClasses(size);
  const tooltipData = getTooltipContent(stance);

  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center space-x-2 rounded-full font-medium border transition-colors duration-200
          ${styles.badge} 
          ${sizeClasses}
          ${className}
          ${showTooltip ? 'cursor-help' : ''}
        `}
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => showTooltip && setTooltipVisible(false)}
        onClick={() => showTooltip && setTooltipVisible(!tooltipVisible)}
      >
        {/* Status Dot */}
        <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
        
        {/* Stance Label */}
        <span>{stance}</span>
        
        {/* Info Icon */}
        {showTooltip && (
          <InformationCircleIcon className="w-4 h-4 opacity-70" />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <div className="absolute z-50 w-72 p-3 mt-2 text-sm bg-white rounded-lg shadow-lg border border-gray-200 left-1/2 transform -translate-x-1/2">
          <div className="font-semibold text-gray-900 mb-1">
            {tooltipData.title}
          </div>
          <div className="text-gray-600 leading-relaxed">
            {tooltipData.content}
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StanceBadge; 