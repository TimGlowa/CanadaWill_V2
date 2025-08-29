/**
 * Centralized date formatting utilities for consistent date display across the application
 */

export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  showTime?: boolean;
  showRelative?: boolean;
  format?: 'short' | 'medium' | 'long' | 'full';
}

export interface RelativeTimeOptions {
  includeSeconds?: boolean;
  threshold?: number; // milliseconds before showing relative time
}

/**
 * Default date formatting options
 */
export const DEFAULT_DATE_OPTIONS: DateFormatOptions = {
  locale: 'en-CA',
  timeZone: 'America/Edmonton',
  showTime: false,
  showRelative: true,
  format: 'medium'
};

/**
 * Format a date string with consistent formatting
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const opts = { ...DEFAULT_DATE_OPTIONS, ...options };
  
  if (!dateString) {
    return 'No date available';
  }

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Check if we should show relative time
    if (opts.showRelative) {
      const relative = getRelativeTime(date, { threshold: 24 * 60 * 60 * 1000 }); // 24 hours
      if (relative) {
        return relative;
      }
    }

    // Format based on the specified format
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: opts.timeZone,
      year: 'numeric',
      month: opts.format === 'short' ? '2-digit' : 'long',
      day: '2-digit'
    };

    if (opts.showTime) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
    }

    return date.toLocaleDateString(opts.locale, formatOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date formatting error';
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "yesterday")
 */
export function getRelativeTime(
  date: Date,
  options: RelativeTimeOptions = {}
): string | null {
  const opts = { includeSeconds: false, threshold: 24 * 60 * 60 * 1000, ...options };
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If the date is too old, don't show relative time
  if (diff > opts.threshold) {
    return null;
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? 'yesterday' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else if (opts.includeSeconds && seconds > 0) {
    return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  } else {
    return 'just now';
  }
}

/**
 * Format date for display in tables (compact format)
 */
export function formatDateForTable(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, {
    format: 'short',
    showRelative: false,
    showTime: false
  });
}

/**
 * Format date with full timestamp
 */
export function formatDateWithTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, {
    format: 'medium',
    showTime: true,
    showRelative: false
  });
}

/**
 * Get the most recent date from an array of date strings
 */
export function getMostRecentDate(dates: (string | Date | null | undefined)[]): Date | null {
  const validDates = dates
    .map(date => date ? new Date(date) : null)
    .filter(date => date && !isNaN(date.getTime()));
  
  if (validDates.length === 0) {
    return null;
  }
  
  return new Date(Math.max(...validDates.map(date => date!.getTime())));
}

/**
 * Check if a date is recent (within specified threshold)
 */
export function isRecentDate(
  dateString: string | Date | null | undefined,
  thresholdMs: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    return diff <= thresholdMs;
  } catch {
    return false;
  }
}

/**
 * Format date for tooltip display
 */
export function formatDateForTooltip(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'No date available';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString('en-CA', {
      timeZone: 'America/Edmonton',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Date formatting error';
  }
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbreviation(): string {
  try {
    const date = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Common Canadian timezone abbreviations
    const timezoneMap: Record<string, string> = {
      'America/Edmonton': 'MST/MDT',
      'America/Calgary': 'MST/MDT',
      'America/Vancouver': 'PST/PDT',
      'America/Toronto': 'EST/EDT',
      'America/Halifax': 'AST/ADT',
      'America/St_Johns': 'NST/NDT'
    };
    
    return timezoneMap[timeZone] || timeZone;
  } catch {
    return 'Local Time';
  }
} 