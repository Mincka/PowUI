import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiConfig } from '../../config/api';
import { UserService } from '../../services/userService';
import { AccountHistoryService } from '../../services/accountHistoryService';
import { CombinedUserData } from '../../types/accounts';
import styles from './InitialSetupWizard.module.css';

interface InitialSetupWizardProps {
  isVisible: boolean;
  onComplete: (config: ApiConfig) => void;
  onCancel: () => void;
}

type SetupStep = 'basic' | 'users' | 'configure';

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({
  isVisible,
  onComplete,
  onCancel,
}) => {
  const { t, i18n } = useTranslation('api');
  const [currentStep, setCurrentStep] = useState<SetupStep>('basic');
  const [config, setConfig] = useState<ApiConfig>({
    mode: 'direct' as const,
    apiUrl: '',
    userId: '',
    bearerToken: '',
    clientId: '',
    clientSecret: '',
    usersToken: '',
  });

  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showUsersToken, setShowUsersToken] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User discovery and creation
  const [discoveredUsers, setDiscoveredUsers] = useState<CombinedUserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userAuthToken, setUserAuthToken] = useState('');
  const [shouldGenerateToken, setShouldGenerateToken] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Allow demo mode on any domain
  const isDemoDomain = () => {
    return true;
  };

  useEffect(() => {
    if (isVisible) {
      // Reset wizard state when opened
      setCurrentStep('basic');
      setError(null);
      setSuccess(null);
      setDiscoveredUsers([]);
      setSelectedUserId(null);
      setUserDisplayName('');
      setUserAuthToken('');
      setShouldGenerateToken(true);
    }
  }, [isVisible]);

  const handleSkipAndDemo = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {

      // Set the demo user as active
      UserService.setActiveUser(8);

      // Generate realistic account history for demo
      const { mockAccountsData } = await import('../../data/mockData');
      AccountHistoryService.generateDemoHistory(mockAccountsData.accounts, 8);

      // Configure mock mode
      const demoConfig: ApiConfig = {
        mode: 'mock',
        apiUrl: '',
        userId: '8',
        bearerToken: 'demo-token',
        clientId: '',
        clientSecret: '',
        usersToken: '',
      };

      // Save demo configuration to localStorage
      localStorage.setItem(
        'apiConfig',
        JSON.stringify({
          mode: 'mock',
          apiUrl: '',
          userId: '8',
          bearerToken: 'demo-token',
          apiVersion: '2.0',
          clientId: '',
          useMockData: true,
        })
      );

      setSuccess(t('demo_mode_activated'));
      
      // Complete the setup with demo config
      setTimeout(() => {
        onComplete(demoConfig);
      }, 1000);
    } catch (err) {
      setError('Failed to activate demo mode');
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeInput = (value: string) => {
    // Allow only safe characters: letters, numbers, dash, underscore, dot, space, and limit length
    return value
      .replace(/[^a-zA-Z0-9\-_./: ]/g, '')
      .substring(0, 128)
      .trim();
  };

  const handleConfigUpdate = (field: keyof ApiConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: sanitizeInput(value),
    }));
  };

  const isBasicConfigValid = () => {
    // All fields must be non-empty and not just whitespace
    return (
      typeof config.apiUrl === 'string' &&
      config.apiUrl.trim() !== '' &&
      typeof config.clientId === 'string' &&
      config.clientId.trim() !== '' &&
      typeof config.clientSecret === 'string' &&
      config.clientSecret.trim() !== '' &&
      typeof config.usersToken === 'string' &&
      config.usersToken.trim() !== ''
    );
  };

  const handleNextToUsers = async () => {
    if (!isBasicConfigValid()) {
      setError(t('fill_required_fields'));
      return;
    }

    // Prevent accidental use of error messages as URLs
    if (
      config.apiUrl.startsWith('API configuration is incomplete') ||
      config.apiUrl.startsWith('http://localhost:3000/API configuration is incomplete')
    ) {
      setError(t('fill_required_fields'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Try to fetch existing users with the provided credentials
      const combinedUsers = await UserService.getCombinedUsersData(config.usersToken!, config);

      setDiscoveredUsers(combinedUsers);
      setCurrentStep('users');

      if (combinedUsers.length > 0) {
        setSuccess(t('users_found', { count: combinedUsers.length }));
      } else {
        setSuccess(t('no_users_found_create_new'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('user_fetch_error');
      setError(t('cannot_fetch_users', { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureExistingUser = (userId: number) => {
    setSelectedUserId(userId);
    setCurrentStep('configure');
    setError(null);
    setSuccess(null);

    // Pre-fill display name if available
    const existingUser = discoveredUsers.find(u => u.apiUser.id === userId);
    if (existingUser?.localUser?.name) {
      setUserDisplayName(existingUser.localUser.name);
    } else {
      setUserDisplayName(`Utilisateur ${userId}`);
    }
  };

  const handleCreateNewUser = async () => {
    setIsCreatingUser(true);
    setError(null);
    setSuccess(null);

    try {
      const newUser = await UserService.createUser(config.clientId, config.clientSecret!, config);

      // Add the new user to our discovered users list
      const newUserData: CombinedUserData = {
        apiUser: { id: newUser.id },
        localUser: newUser,
        isConfigured: true,
      };

      setDiscoveredUsers(prev => [...prev, newUserData]);
      setSelectedUserId(newUser.id);
      setUserDisplayName(newUser.name || `Utilisateur ${newUser.id}`);
      setCurrentStep('configure');
      setSuccess(`Nouvel utilisateur créé avec succès (ID: ${newUser.id})`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de la création de l'utilisateur";
      setError(`Impossible de créer l'utilisateur: ${errorMessage}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleGenerateOrConfigureUser = async () => {
    if (!selectedUserId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let finalUser;

      if (shouldGenerateToken) {
        // Generate a new token for this user
        finalUser = await UserService.renewAndUpdateToken(
          selectedUserId,
          config.clientId,
          config.clientSecret!,
          config,
          false // Don't revoke previous tokens for now
        );
      } else {
        // Use provided token
        if (!userAuthToken.trim()) {
          setError("Veuillez fournir un token d'authentification");
          return;
        }

        finalUser = UserService.configureUser(
          selectedUserId,
          userAuthToken.trim(),
          userDisplayName.trim() || `Utilisateur ${selectedUserId}`
        );
      }

      // Update display name if provided
      if (userDisplayName.trim() && userDisplayName.trim() !== finalUser.name) {
        UserService.updateUserName(selectedUserId, userDisplayName.trim());
        finalUser.name = userDisplayName.trim();
      }

      // Set this user as active
      UserService.setActiveUser(selectedUserId);

      // Determine mode: 'mock' if any required field is missing, else 'direct'
      const requiredFields = [
        config.apiUrl,
        config.clientId,
        config.clientSecret,
        config.usersToken,
        selectedUserId?.toString(),
        finalUser?.authToken,
      ];
      const isComplete = requiredFields.every(Boolean);
      const mode = isComplete ? ('direct' as const) : ('mock' as const);

      // Save the complete configuration including client secret
      const finalConfig: ApiConfig = {
        ...config,
        mode,
        userId: selectedUserId.toString(),
        bearerToken: finalUser.authToken,
        clientSecret: config.clientSecret, // Store client secret for future operations
        usersToken: config.usersToken, // Store users token for future operations
      };

      // Save to localStorage with correct keys for useApiConfig
      localStorage.setItem(
        'apiConfig',
        JSON.stringify({
          mode: finalConfig.mode,
          apiUrl: finalConfig.apiUrl || '',
          userId: finalConfig.userId,
          bearerToken: finalConfig.bearerToken,
          apiVersion: '2.0',
          clientId: finalConfig.clientId,
          // Optionally keep extra fields for other components
          clientSecret: finalConfig.clientSecret,
          usersToken: finalConfig.usersToken,
          useMockData: !isComplete,
        })
      );

      // Complete the setup
      onComplete(finalConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la configuration';
      setError(`Impossible de configurer l'utilisateur: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setSuccess(null);

    if (currentStep === 'users') {
      setCurrentStep('basic');
    } else if (currentStep === 'configure') {
      setCurrentStep('users');
    }
  };

  const renderBasicStep = () => (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>{t('initial_setup_title')}</h3>
        <p>{t('initial_setup_description')}</p>
      </div>

      {/* Demo mode section first */}
      {isDemoDomain() && (
        <div className={styles.demoSection}>
          <div className={styles.demoHeader}>
            <h4>{t('demo_mode_title')}</h4>
            <p>{t('demo_mode_description')}</p>
          </div>
          <button
            onClick={handleSkipAndDemo}
            className={styles.btnDemo}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? t('configuring') : t('skip_and_demo')}
          </button>
        </div>
      )}

      {/* Organization-level settings */}
      <div className={styles.sectionHeader}>{t('organization_settings')}</div>
      <div className={styles.formGroup}>
        <label htmlFor="wizard-api-url">{t('api_url', 'API URL')} *</label>
        <input
          id="wizard-api-url"
          type="text"
          value={config.apiUrl}
          onChange={e => handleConfigUpdate('apiUrl', e.target.value)}
          placeholder={t('api_url_placeholder', 'https://demo1-sandbox.biapi.pro/2.0/')}
          className={config.apiUrl ? styles.valid : styles.invalid}
          autoComplete="off"
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="wizard-users-token">{t('users_token')} *</label>
        <div className={styles.passwordInput}>
          <input
            id="wizard-users-token"
            type={showUsersToken ? 'text' : 'password'}
            value={config.usersToken || ''}
            onChange={e => handleConfigUpdate('usersToken', e.target.value)}
            placeholder={t('users_token_placeholder')}
            className={config.usersToken ? styles.valid : styles.invalid}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowUsersToken(!showUsersToken)}
            className={styles.toggleButton}
            title={showUsersToken ? t('common:hide') : t('common:show')}
          >
            {showUsersToken ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>
      <div className={styles.infoBox}>
        <p>
          <strong>{t('where_to_find_info')}</strong>
        </p>
        <p>{t('info_location_description')}</p>
      </div>
      {/* Application-level settings */}
      <div className={styles.sectionHeader}>{t('application_settings')}</div>
      <div className={styles.formGroup}>
        <label htmlFor="wizard-client-id">{t('client_id')} *</label>
        <input
          id="wizard-client-id"
          type="text"
          value={config.clientId}
          onChange={e => handleConfigUpdate('clientId', e.target.value)}
          placeholder={t('client_id_placeholder')}
          className={config.clientId ? styles.valid : styles.invalid}
          autoComplete="off"
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="wizard-client-secret">{t('client_secret')} *</label>
        <div className={styles.passwordInput}>
          <input
            id="wizard-client-secret"
            type={showClientSecret ? 'text' : 'password'}
            value={config.clientSecret || ''}
            onChange={e => handleConfigUpdate('clientSecret', e.target.value)}
            placeholder={t('client_secret_placeholder')}
            className={config.clientSecret ? styles.valid : styles.invalid}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowClientSecret(!showClientSecret)}
            className={styles.toggleButton}
            title={showClientSecret ? t('common:hide') : t('common:show')}
          >
            {showClientSecret ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>
      <div className={styles.infoBox}>
        <p>
          <strong>{t('where_to_find_app_info')}</strong>
        </p>
        <p>{t('app_info_location_description', { redirectUri: 'https://example.com' })}</p>
      </div>

      <div className={styles.stepActions}>
        <button onClick={onCancel} className={styles.btnCancel} type="button">
          {t('common:cancel')}
        </button>
        <button
          onClick={handleNextToUsers}
          className={styles.btnNext}
          disabled={!isBasicConfigValid() || isLoading}
          type="button"
        >
          {isLoading ? t('verifying') : t('next_verify_users')}
        </button>
      </div>
    </div>
  );

  const renderUsersStep = () => (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>{t('users_detected')}</h3>
        <p>{t('users_found_description')}</p>
      </div>

      {discoveredUsers.length > 0 ? (
        <div className={styles.usersList}>
          <h4>{t('existing_users')}:</h4>
          {discoveredUsers.map(userData => (
            <div key={userData.apiUser.id} className={styles.userItem}>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {userData.isConfigured
                    ? userData.localUser?.name || `User ${userData.apiUser.id}`
                    : `User ${userData.apiUser.id}`}
                  {userData.isConfigured && (
                    <span className={styles.configuredBadge}>{t('configured')}</span>
                  )}
                  {!userData.isConfigured && (
                    <span className={styles.unconfiguredBadge}>{t('not_configured')}</span>
                  )}
                </div>
                <div className={styles.userDetails}>ID: {userData.apiUser.id}</div>
              </div>
              <button
                onClick={() => handleConfigureExistingUser(userData.apiUser.id)}
                className={styles.btnConfigure}
              >
                {userData.isConfigured ? t('use') : t('configure')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>{t('no_existing_users_found')}</p>
        </div>
      )}

      <div className={styles.createUserSection}>
        <h4>{t('or_create_new_user')}:</h4>
        <button
          onClick={handleCreateNewUser}
          className={styles.btnCreateUser}
          disabled={isCreatingUser}
        >
          {isCreatingUser ? t('creating_user') : t('create_new_user')}
        </button>
      </div>

      <div className={styles.stepActions}>
        <button onClick={handleBack} className={styles.btnBack} type="button">
          {t('common:back')}
        </button>
      </div>
    </div>
  );

  const renderConfigureStep = () => (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>{t('user_configuration')}</h3>
        <p>{t('configure_selected_user', { id: selectedUserId })}</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="wizard-user-name">{t('forms:display_name')}</label>
        <input
          id="wizard-user-name"
          type="text"
          value={userDisplayName}
          onChange={e => setUserDisplayName(sanitizeInput(e.target.value))}
          placeholder={t('user_name_placeholder')}
          autoComplete="off"
        />
      </div>

      <div className={styles.tokenOptions}>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              checked={shouldGenerateToken}
              onChange={() => setShouldGenerateToken(true)}
            />
            <span>{t('auto_generate_token')}</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              checked={!shouldGenerateToken}
              onChange={() => setShouldGenerateToken(false)}
            />
            <span>{t('have_existing_token')}</span>
          </label>
        </div>

        {!shouldGenerateToken && (
          <div className={styles.formGroup}>
            <label htmlFor="wizard-auth-token">{t('auth_token')}</label>
            <div className={styles.passwordInput}>
              <input
                id="wizard-auth-token"
                type={showAuthToken ? 'text' : 'password'}
                value={userAuthToken}
                onChange={e => setUserAuthToken(e.target.value)}
                placeholder={t('auth_token_placeholder')}
                className={userAuthToken.trim() ? styles.valid : styles.invalid}
              />
              <button
                type="button"
                onClick={() => setShowAuthToken(!showAuthToken)}
                className={styles.toggleButton}
                title={showAuthToken ? t('common:hide') : t('common:show')}
              >
                {showAuthToken ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.stepActions}>
        <button onClick={handleBack} className={styles.btnBack} type="button">
          {t('common:back')}
        </button>
        <button
          onClick={handleGenerateOrConfigureUser}
          className={styles.btnComplete}
          disabled={isLoading || (!shouldGenerateToken && !userAuthToken.trim())}
          type="button"
        >
          {isLoading ? t('configuring') : t('finalize_configuration')}
        </button>
      </div>
    </div>
  );

  if (!isVisible) return null;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
    localStorage.setItem('i18nextLng', e.target.value);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{t('setup_wizard_title')}</h2>
          <div className={styles.languageSelector} style={{ marginTop: 8, marginBottom: 8 }}>
            <label htmlFor="wizard-language-select" style={{ marginRight: 8 }}>
              {t('common:language') || 'Language'}:
            </label>
            <select
              id="wizard-language-select"
              value={i18n.language}
              onChange={handleLanguageChange}
              style={{ padding: '4px 8px' }}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div className={styles.stepIndicator}>
            <div
              className={`${styles.stepDot} ${currentStep === 'basic' ? styles.active : styles.completed}`}
            >
              1
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${currentStep === 'users' ? styles.active : currentStep === 'configure' ? styles.completed : ''}`}
            >
              2
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${currentStep === 'configure' ? styles.active : ''}`}
            >
              3
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>❌ {error}</div>}

        {success && <div className={styles.success}>✅ {success}</div>}

        {currentStep === 'basic' && renderBasicStep()}
        {currentStep === 'users' && renderUsersStep()}
        {currentStep === 'configure' && renderConfigureStep()}
      </div>
    </div>
  );
};
