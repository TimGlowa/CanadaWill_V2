import React, { useState, useEffect } from 'react';
import { formatDate, formatDateForTooltip, isRecentDate } from '../../utils/dateUtils';

interface DynamicLastUpdatedProps {
  /** The date string to display */
  dateString: string | null | undefined;
  /** Whether to show relative time for recent dates */
  showRelative?: boolean;
  /** Refresh interval in milliseconds (default: 60 seconds) */
  refreshInterval?: number;
  /** CSS class name for styling */
  className?: string;
  /** Whether to show a visual indicator for recent updates */
  showRecentIndicator?: boolean;
  /** Custom label prefix */
  label?: string;
}

/**
 * Dynamic component that displays and automatically updates last updated timestamps
 */
const DynamicLastUpdated: React.FC<DynamicLastUpdatedProps> = ({
  dateString,
  showRelative = true,
  refreshInterval = 60000, // 1 minute
  className = '',
  showRecentIndicator = true,
  label = 'Last updated'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRecent, setIsRecent] = useState(false);

  // Update current time and check if date is recent
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      if (dateString) {
        setIsRecent(isRecentDate(dateString, 24 * 60 * 60 * 1000)); // 24 hours
      }
    };

    // Initial update
    updateTime();

    // Set up interval for updates
    const interval = setInterval(updateTime, refreshInterval);

    return () => clearInterval(interval);
  }, [dateString, refreshInterval]);

  if (!dateString) {
    return (
      <span className={`text-xs text-gray-400 ${className}`}>
        {label}: No date available
      </span>
    );
  }

  const formattedDate = formatDate(dateString, { showRelative });
  const tooltipText = formatDateForTooltip(dateString);

  return (
    <span 
      className={`text-xs text-gray-400 ${className} ${isRecent && showRecentIndicator ? 'animate-pulse' : ''}`}
      title={tooltipText}
    >
      <span className="cursor-help">
        {label}: {formattedDate}
      </span>
      {isRecent && showRecentIndicator && (
        <span className="ml-1 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" 
              title="Recently updated" />
      )}
    </span>
  );
};

export default DynamicLastUpdated; 