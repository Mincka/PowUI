import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApiConfig,
  validateApiConfig,
  validateBaseApiConfig,
  needsInitialSetup,
} from '../../config/api';
import { AccountsService } from '../../services/accountsService';
import { UserManager } from '../UserManager';
import { UserService } from '../../services/userService';
import { PowensUser } from '../../types/accounts';
import { InitialSetupWizard } from '../InitialSetupWizard';
import { useLanguage } from '../../i18n/hooks/useLanguage';
import styles from './ApiConfiguration.module.css';

interface ApiConfigurationProps {
  onConfigChange: (newConfig: ApiConfig) => void;
  currentConfig: ApiConfig;
}

export const ApiConfiguration: React.FC<ApiConfigurationProps> = ({
  onConfigChange,
  currentConfig,
}) => {
  const { t } = useTranslation('api');
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const [config, setConfig] = useState<ApiConfig>(currentConfig);
  const [isVisible, setIsVisible] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showUsersToken, setShowUsersToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [activeUser, setActiveUser] = useState<PowensUser | null>(null);

  useEffect(() => {
    // Check if initial setup is needed (missing critical fields)
    if (needsInitialSetup(currentConfig)) {
      setShowInitialSetup(true);
    } else if (!validateBaseApiConfig(currentConfig)) {
      // Show regular configuration panel if base API config is incomplete
      setIsVisible(true);
    }
  }, [currentConfig]);

  const loadFromLocalStorage = React.useCallback(() => {
    try {
      const saved = localStorage.getItem('apiConfig');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        const updatedConfig = {
          ...config,
          mode: savedConfig.mode || 'mock',
          apiUrl: savedConfig.apiUrl || '',
          userId: savedConfig.userId || '',
          bearerToken: savedConfig.bearerToken || '',
          clientId: savedConfig.clientId || '',
          clientSecret: savedConfig.clientSecret || '',
          usersToken: savedConfig.usersToken || '',
        };
        setConfig(updatedConfig);
        // Set mock data based on mode or fallback to useMockData for backward compatibility
        setUseMockData(savedConfig.mode === 'mock' || savedConfig.useMockData || false);
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  }, []);

  // Load from localStorage whenever the panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadFromLocalStorage();
    }
  }, [isVisible, loadFromLocalStorage]);

  const handleConfigUpdate = (field: keyof ApiConfig, value: string) => {
    const updatedConfig = {
      ...config,
      [field]: value,
    };
    setConfig(updatedConfig);
  };

  const handleSave = () => {
    // Set the mode based on the mock data preference
    const configWithMode = {
      ...config,
      mode: useMockData ? ('mock' as const) : ('direct' as const),
    };

    // For mock mode, or when base config is valid (domain + clientId)
    if (useMockData || validateBaseApiConfig(configWithMode)) {
      try {
        // Save to localStorage for persistence including mock data preference
        localStorage.setItem(
          'apiConfig',
          JSON.stringify({
            mode: configWithMode.mode,
            apiUrl: config.apiUrl,
            userId: config.userId,
            bearerToken: config.bearerToken,
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
            usersToken: config.usersToken || '',
            useMockData: useMockData, // Keep for backward compatibility
          })
        );

        // Set the config with the correct mode
        AccountsService.setConfig(configWithMode);

        // Call onConfigChange to trigger data refresh in the parent
        onConfigChange(configWithMode);
        setIsVisible(false);
      } catch (error) {
        console.error('Error saving configuration:', error);
        setTestResult({
          success: false,
          message: t('config_save_error'),
        });
      }
    }
  };

  const handleCancel = () => {
    // Reload from localStorage instead of reverting to currentConfig
    // This ensures we keep the persisted values for all fields
    loadFromLocalStorage();
    setIsVisible(false);
  };

  const clearConfiguration = () => {
    const confirmReset = window.confirm(
      t(
        'confirm_reset_all_data',
        'Are you sure you want to reset the application? All configuration and user data will be removed. This action cannot be undone.'
      )
    );
    if (!confirmReset) return;
    localStorage.clear();
    window.location.reload();
  };

  const resetToInitialSetup = () => {
    // Clear all configuration and user data
    const resetConfig = {
      mode: 'mock' as const,
      apiUrl: '',
      userId: '',
      bearerToken: '',
      clientId: '',
      clientSecret: '',
      usersToken: '',
    };

    setConfig(resetConfig);
    localStorage.removeItem('apiConfig');
    localStorage.removeItem('powensUsers');
    localStorage.removeItem('powensUsersToken');
    setTestResult(null);
    setActiveUser(null);

    // Update parent component with reset config
    onConfigChange(resetConfig);

    // Show the initial setup wizard but keep the config panel open
    setShowInitialSetup(true);
    // Don't close the config panel - setIsVisible(false);
  };

  const testConnection = async () => {
    // Create config with direct mode for testing
    const testConfig = {
      ...config,
      mode: 'direct' as const,
    };

    if (!validateApiConfig(testConfig)) {
      setTestResult({
        success: false,
        message: t('config_incomplete_error'),
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Test the connection with the direct API config
      await AccountsService.fetchAccounts(testConfig);
      setTestResult({
        success: true,
        message: t('connection_successful'),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors:unknown_error');
      setTestResult({
        success: false,
        message: t('connection_failed', { error: errorMessage }),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    loadFromLocalStorage();
    loadActiveUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActiveUser = () => {
    const activeUserFromStorage = UserService.getActiveUser();
    setActiveUser(activeUserFromStorage);
  };

  const handleUserSwitch = (user: PowensUser) => {
    // Update the config with the new user's credentials
    const updatedConfig = {
      ...config,
      userId: user.id.toString(),
      bearerToken: user.authToken,
    };

    setConfig(updatedConfig);
    setActiveUser(user);

    // Auto-save the configuration when switching users
    const configWithMode = {
      ...updatedConfig,
      mode: useMockData ? ('mock' as const) : ('direct' as const),
    };

    try {
      localStorage.setItem(
        'apiConfig',
        JSON.stringify({
          mode: configWithMode.mode,
          apiUrl: updatedConfig.apiUrl,
          userId: updatedConfig.userId,
          bearerToken: updatedConfig.bearerToken,
          clientId: updatedConfig.clientId || '',
          clientSecret: updatedConfig.clientSecret || '',
          usersToken: updatedConfig.usersToken || '',
          useMockData: useMockData,
        })
      );

      AccountsService.setConfig(configWithMode);
      onConfigChange(configWithMode);

      setTestResult({
        success: true,
        message: t('user_switched', { userName: user.name }),
      });
    } catch (error) {
      console.error('Error switching user:', error);
      setTestResult({
        success: false,
        message: t('user_switch_error'),
      });
    }
  };

  const handleInitialSetupComplete = (finalConfig: ApiConfig) => {
    // Update the local config state
    setConfig(finalConfig);

    // Ensure mock data is unchecked after setup wizard completion
    setUseMockData(false);

    // Set the account service configuration
    AccountsService.setConfig(finalConfig);

    // Notify parent component
    onConfigChange(finalConfig);

    // Load the active user
    loadActiveUser();

    // Close the initial setup wizard
    setShowInitialSetup(false);
  };

  const handleInitialSetupCancel = () => {
    setShowInitialSetup(false);
    // If there's no valid configuration, they'll need to use mock data or configure manually
    if (needsInitialSetup(currentConfig)) {
      setUseMockData(true);
    }
  };

  // Reset test result when config changes
  useEffect(() => {
    setTestResult(null);
  }, [config.apiUrl, config.userId, config.bearerToken]);

  // Reset test result when switching from mock to real API mode
  useEffect(() => {
    if (!useMockData) {
      setTestResult(null);
    }
  }, [useMockData]);

  // Create configs for different validation purposes
  const testConfigForValidation = {
    ...config,
    mode: 'direct' as const,
  };
  const baseConfigForValidation = {
    ...config,
    mode: 'direct' as const,
  };

  // Full validation for connection testing (needs user credentials)
  const isConfigValid = validateApiConfig(testConfigForValidation);
  // Base validation for form display (only needs domain + clientId)
  const isBaseConfigValid = validateBaseApiConfig(baseConfigForValidation);

  // Check if mock data preference has changed
  let currentMockDataSetting = false;
  try {
    const savedConfig = localStorage.getItem('apiConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      currentMockDataSetting = parsedConfig.useMockData || false;
    }
  } catch (error) {
    console.error('Error parsing saved config for mock data check:', error);
  }
  const mockDataChanged = useMockData !== currentMockDataSetting;

  // Allow saving if:
  // 1. Using mock data (no testing required)
  // 2. Base config is valid (domain + clientId) when not using mock data
  // 3. Mock data preference changed from real API to mock (no testing required for switching to mock)
  const canSave =
    useMockData || (mockDataChanged && useMockData) || (!useMockData && isBaseConfigValid);

  if (!isVisible) {
    return (
      <div className={styles.configToggle}>
        <button
          onClick={() => setIsVisible(true)}
          className={styles.configToggleBtn}
          title={t('configuration')}
        >
          ⚙️ {t('configuration')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.configForm}>
        <div className={styles.header}>
          <h3>{t('configuration')}</h3>
          <div className={styles.headerControls}>
            {/* Language Selector */}
            <div className={styles.languageSelector}>
              <label htmlFor="language-select">{t('common:language')}:</label>
              <select
                id="language-select"
                value={currentLanguage}
                onChange={e => changeLanguage(e.target.value)}
                className={styles.languageSelect}
              >
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleCancel} className={styles.closeBtn} title={t('common:close')}>
              ✕
            </button>
          </div>
        </div>
        {/* Organization-level settings */}
        <div className={styles.sectionHeader}>
          {t('organization_settings', 'Organization Settings')}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="api-url">{t('api_url', 'API URL')} *</label>
          <input
            id="api-url"
            type="text"
            value={config.apiUrl}
            onChange={e => handleConfigUpdate('apiUrl', e.target.value)}
            placeholder={t('api_url_placeholder', 'https://demo1-sandbox.biapi.pro/2.0/')}
            className={config.apiUrl ? styles.valid : styles.invalid}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="users-token">{t('users_token')} *</label>
          <div className={styles.secretInputGroup}>
            <input
              id="users-token"
              type={showUsersToken ? 'text' : 'password'}
              value={config.usersToken || ''}
              onChange={e => handleConfigUpdate('usersToken', e.target.value)}
              placeholder={t('users_token_placeholder')}
              className={config.usersToken ? styles.valid : styles.invalid}
            />
            <button
              type="button"
              onClick={() => setShowUsersToken(!showUsersToken)}
              className={styles.toggleVisibility}
              title={showUsersToken ? t('hide') : t('show')}
            >
              {showUsersToken ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Application-level settings */}
        <div className={styles.sectionHeader}>
          {t('application_settings', 'Powens Application Settings')}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="client-id">{t('client_id')} *</label>
          <input
            id="client-id"
            type="text"
            value={config.clientId}
            onChange={e => handleConfigUpdate('clientId', e.target.value)}
            placeholder={t('client_id_placeholder')}
            className={config.clientId ? styles.valid : styles.invalid}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="client-secret">{t('client_secret')} *</label>
          <div className={styles.secretInputGroup}>
            <input
              id="client-secret"
              type={showClientSecret ? 'text' : 'password'}
              value={config.clientSecret || ''}
              onChange={e => handleConfigUpdate('clientSecret', e.target.value)}
              placeholder={t('client_secret_placeholder')}
              className={config.clientSecret ? styles.valid : styles.invalid}
            />
            <button
              type="button"
              onClick={() => setShowClientSecret(!showClientSecret)}
              className={styles.toggleVisibility}
              title={showClientSecret ? t('hide') : t('show')}
            >
              {showClientSecret ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* User Management Section */}
        <div className={styles.userManagement}>
          <div className={styles.userInfo}>
            {activeUser ? (
              <div className={styles.activeUserDisplay}>
                <span className={styles.userLabel}>{t('current_user')}</span>
                <span className={styles.userName}>
                  {activeUser.name || `User ${activeUser.id}`}
                </span>
                <span className={styles.userBadge}>
                  {t('user_id_label', { id: activeUser.id })}
                </span>
              </div>
            ) : (
              <div className={styles.noActiveUser}>
                <span className={styles.userLabel}>{t('no_powens_user')}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowUserManager(true)}
            className={styles.btnManageUsers}
            type="button"
            disabled={!config.apiUrl || !config.clientId}
            title={
              !config.apiUrl || !config.clientId
                ? t('configure_api_url_client_first', 'Configure API URL and Client ID first')
                : ''
            }
          >
            {t('manage_users')}
          </button>
        </div>

        <div className={styles.configStatus}>
          {useMockData ? (
            <span className={styles.statusValid}>{t('mock_data_enabled')}</span>
          ) : isBaseConfigValid ? (
            <span className={styles.statusValid}>{t('base_config_valid')}</span>
          ) : (
            <span className={styles.statusInvalid}>{t('config_incomplete')}</span>
          )}
        </div>

        <div className={styles.mockDataOption}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={useMockData}
              onChange={e => setUseMockData(e.target.checked)}
            />
            <span>{t('use_mock_data')}</span>
          </label>
        </div>

        {!useMockData && (
          <div className={styles.testConnection}>
            <button
              onClick={testConnection}
              className={styles.btnTest}
              disabled={!isConfigValid || isTestingConnection}
              type="button"
            >
              {isTestingConnection ? t('testing') : t('test_connection')}
            </button>

            {testResult && (
              <div
                className={`${styles.testResult} ${testResult.success ? styles.success : styles.error}`}
              >
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </div>
            )}
          </div>
        )}

        <div className={styles.configActions}>
          <div className={styles.utilityActions}>
            <button onClick={clearConfiguration} className={styles.btnClear} type="button">
              {t('common:reset')}
            </button>
            <button
              onClick={resetToInitialSetup}
              className={styles.btnReset}
              type="button"
              title={t('configuration_wizard_tooltip')}
            >
              {t('configuration_wizard')}
            </button>
          </div>
          <div className={styles.mainActions}>
            <button onClick={handleCancel} className={styles.btnCancel} type="button">
              {t('common:cancel')}
            </button>
            <button
              onClick={handleSave}
              className={styles.btnSave}
              disabled={!canSave}
              type="button"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      </div>

      {/* User Manager Modal */}
      <UserManager
        isVisible={showUserManager}
        onClose={() => {
          setShowUserManager(false);
          loadActiveUser(); // Refresh active user display
        }}
        onUserSwitch={handleUserSwitch}
        currentConfig={config}
      />

      {/* Initial Setup Wizard */}
      <InitialSetupWizard
        isVisible={showInitialSetup}
        onComplete={handleInitialSetupComplete}
        onCancel={handleInitialSetupCancel}
      />
    </div>
  );
};
