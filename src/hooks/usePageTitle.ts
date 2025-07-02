import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook to update the page title based on the current language
 */
export const usePageTitle = () => {
  const { t, i18n } = useTranslation('dashboard');

  useEffect(() => {
    // Update the page title when language changes
    const updateTitle = () => {
      document.title = t('title');
    };

    // Set initial title
    updateTitle();

    // Listen for language changes
    i18n.on('languageChanged', updateTitle);

    // Cleanup listener on unmount
    return () => {
      i18n.off('languageChanged', updateTitle);
    };
  }, [t, i18n]);
};
