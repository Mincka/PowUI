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
