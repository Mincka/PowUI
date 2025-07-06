/**
 * Get today's date in YYYY-MM-DD format using the browser's local timezone
 * Uses 'en-CA' locale because it's the only English locale that returns ISO 8601 format (YYYY-MM-DD)
 * This ensures date operations match the user's local calendar day, not UTC
 */
export const getLocalDateString = (): string => {
  return new Date().toLocaleDateString('en-CA');
};

/**
 * Get a specific date in YYYY-MM-DD format using the browser's local timezone
 */
export const formatLocalDate = (date: Date): string => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Compare two date strings and return true if they represent different dates
 */
export const areDatesEqual = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Format a date string for display in French format (DD/MM/YYYY)
 */
export const formatDisplayDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format date and time according to language and regional settings.
 * Returns { date, time } strings.
 */
export const formatDateTimeLocalized = (
  date: Date,
  lang: string
): { date: string; time: string } => {
  let dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  let timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

  if (lang === 'en') {
    // Use 24h for Europe, 12h for US/Canada
    // Default to 24h for this app
    dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return {
      date: date.toLocaleDateString('en-GB', dateOptions),
      time: date.toLocaleTimeString('en-GB', timeOptions),
    };
  } else if (lang === 'fr') {
    return {
      date: date.toLocaleDateString('fr-FR', dateOptions),
      time: date.toLocaleTimeString('fr-FR', timeOptions),
    };
  }
  // fallback
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

/**
 * Format relative time (e.g., "in 2 hours", "in 3 days") for EN/FR.
 * Returns a localized string.
 */
export const formatRelativeTime = (
  target: Date,
  lang: string
): string => {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) {
    if (lang === 'fr') return `quelques secondes`;
    return `a few seconds`;
  } else if (diffMin < 60) {
    if (lang === 'fr') return `dans ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    return `in ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else if (diffHour < 24) {
    if (lang === 'fr') return `dans ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
    return `in ${diffHour} hour${diffHour > 1 ? 's' : ''}`;
  } else {
    if (lang === 'fr') return `dans ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
    return `in ${diffDay} day${diffDay > 1 ? 's' : ''}`;
  }
};
