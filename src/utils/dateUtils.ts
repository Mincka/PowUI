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
