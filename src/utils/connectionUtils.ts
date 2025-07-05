/**
 * Utility functions for connection management
 */

/**
 * Check if advanced connection steps are enabled in the configuration
 * Returns false by default (simplified mode)
 */
export const isAdvancedConnectionStepsEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem('apiConfig');
    if (saved) {
      const config = JSON.parse(saved);
      return config.showAdvancedConnectionSteps || false;
    }
  } catch (error) {
    console.error('Error reading advanced connection steps setting:', error);
  }
  return false; // Default to simplified mode
};

/**
 * Get the current language setting from localStorage
 * Used for language-specific webview URLs
 */
export const getCurrentLanguage = (): string => {
  try {
    const language = localStorage.getItem('i18nextLng');
    return language === 'fr' ? 'fr' : 'en';
  } catch (error) {
    console.error('Error reading language setting:', error);
  }
  return 'en'; // Default to English
};
