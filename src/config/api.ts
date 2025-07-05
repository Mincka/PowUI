export interface ApiConfig {
  mode: 'direct' | 'mock';
  // Direct BiAPI mode
  apiUrl: string; // Full API URL with version, e.g. https://demo1-sandbox.biapi.pro/2.0/
  userId: string;
  bearerToken: string;
  clientId: string;
  clientSecret?: string; // Optional, only used for user creation operations
  usersToken?: string; // Optional, Users token for listing users (from Server keys section)
}

// Environment variable access with proper typing
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: check for runtime config
    return (window as { __APP_CONFIG__?: Record<string, string> }).__APP_CONFIG__?.[key] || '';
  }
  // Build-time: use Vite environment variables
  return (import.meta as { env?: Record<string, string> }).env?.[key] || '';
};

export const defaultApiConfig: ApiConfig = {
  mode: (getEnvVar('VITE_API_MODE') as ApiConfig['mode']) || 'mock',
  apiUrl: getEnvVar('VITE_API_URL') || '',
  userId: getEnvVar('VITE_USER_ID') || '',
  bearerToken: getEnvVar('VITE_BEARER_TOKEN') || '',
  clientId: getEnvVar('VITE_CLIENT_ID') || '',
  clientSecret: getEnvVar('VITE_CLIENT_SECRET') || '',
  usersToken: getEnvVar('VITE_USERS_TOKEN') || '',
};

// Function to validate base configuration (domain and clientId only)
export const validateBaseApiConfig = (apiConfig: ApiConfig): boolean => {
  switch (apiConfig.mode) {
    case 'direct':
      // For direct mode, we only need apiUrl and clientId in the main form
      // userId and bearerToken are managed through User Manager
      return !!(apiConfig.apiUrl && apiConfig.clientId);
    case 'mock':
      return true; // Mock mode always valid
    default:
      return false;
  }
};

// Function to validate full configuration (including user credentials)
export const validateApiConfig = (apiConfig: ApiConfig): boolean => {
  switch (apiConfig.mode) {
    case 'direct':
      // For full validation, we still need all fields including user credentials
      return !!(
        apiConfig.apiUrl &&
        apiConfig.clientId &&
        apiConfig.userId &&
        apiConfig.bearerToken
      );
    case 'mock':
      return true; // Mock mode always valid
    default:
      return false;
  }
};

// Function to get detailed validation errors
export const getApiConfigValidationErrors = (apiConfig: ApiConfig): string[] => {
  const errors: string[] = [];

  switch (apiConfig.mode) {
    case 'direct':
      if (!apiConfig.apiUrl) errors.push('API URL');
      if (!apiConfig.clientId) errors.push('Client ID');
      if (!apiConfig.userId) errors.push('User ID');
      if (!apiConfig.bearerToken) errors.push('Bearer Token');
      break;
    case 'mock':
      // Mock mode doesn't require validation
      break;
    default:
      errors.push('Invalid mode');
  }

  return errors;
};

// Function to validate configuration for new connection setup (requires client ID)
export const validateApiConfigForNewConnection = (apiConfig: ApiConfig): boolean => {
  return validateApiConfig(apiConfig) && !!apiConfig.clientId;
};

// Function to check if initial setup is needed
export const needsInitialSetup = (apiConfig: ApiConfig): boolean => {
  // Check if we're in mock mode (which means setup is complete for demo purposes)
  if (apiConfig.mode === 'mock') {
    return false;
  }

  // For direct mode, we need at minimum apiUrl and clientId to be considered "configured"
  // The clientSecret and usersToken are needed for user management but not for basic operation
  // if a user has already been configured
  const hasBasicConfig = !!(apiConfig.apiUrl && apiConfig.clientId);

  // If we don't have basic config, we definitely need initial setup
  if (!hasBasicConfig) {
    return true;
  }

  // If we have basic config but no user is configured, we need initial setup
  try {
    const storedUsers = JSON.parse(localStorage.getItem('powensUsers') || '[]');
    const hasConfiguredUsers = storedUsers.length > 0;
    return !hasConfiguredUsers;
  } catch {
    return true; // If we can't parse stored users, assume we need setup
  }
};

/**
 * Returns the full API URL for a given endpoint.
 * Assumes apiUrl ends with a slash.
 * Example: apiUrl = "https://demo1-sandbox.biapi.pro/2.0/"
 */
export const getBaseUrl = (config: ApiConfig): string => {
  return `${config.apiUrl}users/${config.userId}`;
};

export const getAccountsUrl = (config: ApiConfig): string => {
  return `${getBaseUrl(config)}/accounts`;
};
