import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonFr from './locales/fr/common.json';
import dashboardFr from './locales/fr/dashboard.json';
import connectionsFr from './locales/fr/connections.json';
import financialFr from './locales/fr/financial.json';
import apiFr from './locales/fr/api.json';
import formsFr from './locales/fr/forms.json';
import errorsFr from './locales/fr/errors.json';
import realEstateFr from './locales/fr/realEstate.json';

import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import connectionsEn from './locales/en/connections.json';
import financialEn from './locales/en/financial.json';
import apiEn from './locales/en/api.json';
import formsEn from './locales/en/forms.json';
import errorsEn from './locales/en/errors.json';
import realEstateEn from './locales/en/realEstate.json';

// Translation resources
const resources = {
  fr: {
    common: commonFr,
    dashboard: dashboardFr,
    connections: connectionsFr,
    financial: financialFr,
    api: apiFr,
    forms: formsFr,
    errors: errorsFr,
    realEstate: realEstateFr,
  },
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    connections: connectionsEn,
    financial: financialEn,
    api: apiEn,
    forms: formsEn,
    errors: errorsEn,
    realEstate: realEstateEn,
  },
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.MODE === 'development',

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Default namespace
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'connections', 'financial', 'api', 'forms', 'errors', 'realEstate'],
  });

export default i18n;
