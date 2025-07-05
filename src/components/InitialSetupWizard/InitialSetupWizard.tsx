import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiConfig } from '../../config/api';
import { UserService } from '../../services/userService';
import { AccountHistoryService } from '../../services/accountHistoryService';
import { AccountsService } from '../../services/accountsService';
import { ConnectorService } from '../../services/connectorService';
import { CombinedUserData, Connector, Connection } from '../../types/accounts';
import { isAdvancedConnectionStepsEnabled, getCurrentLanguage } from '../../utils/connectionUtils';
import styles from './InitialSetupWizard.module.css';

interface InitialSetupWizardProps {
  isVisible: boolean;
  onComplete: (config: ApiConfig) => void;
  onCancel: () => void;
}

type SetupStep = 'basic' | 'users' | 'configure' | 'connections';

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

  // Connection setup state
  const [temporaryCode, setTemporaryCode] = useState<string>('');
  const [webviewUrl, setWebviewUrl] = useState<string>('');
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [finalConfig, setFinalConfig] = useState<ApiConfig | null>(null);
  const [existingConnections, setExistingConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());

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
    } catch (_err) {
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

      // Store the final config and advance to connections step
      setFinalConfig(finalConfig);

      // Check for existing connections
      checkExistingConnections(finalConfig);

      setCurrentStep('connections');
      setSuccess(t('user_configured_successfully'));
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
    } else if (currentStep === 'connections') {
      // Reset connection state when going back
      setTemporaryCode('');
      setWebviewUrl('');
      setConnectionError('');
      setCurrentStep('configure');
    }
  };

  // Check for existing connections with connector info
  const checkExistingConnections = async (config: ApiConfig) => {
    if (!config) return;

    setIsLoadingConnections(true);
    try {
      // Fetch existing connections
      const response = await AccountsService.fetchConnections(config);
      const connections = response?.connections || [];

      if (connections.length > 0) {
        // Get unique connector IDs from connections
        const connectorIds = [
          ...new Set(
            connections
              .map(conn => conn.id_connector)
              .filter((id): id is number => typeof id === 'number')
          ),
        ];

        if (connectorIds.length > 0) {
          // Load connector information using ConnectorService
          const connectors = await ConnectorService.getConnectorsWithCache(connectorIds, config);
          setConnectorMap(connectors);
        }
      }

      setExistingConnections(connections);
    } catch (err) {
      console.log('No existing connections found or error fetching:', err);
      setExistingConnections([]);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Get bank name from connector
  const getBankName = (connection: Connection): string => {
    if (!connection.id_connector) {
      return `Connection ${connection.id}`;
    }
    return ConnectorService.getConnectorName(connection.id_connector, connectorMap);
  };

  // Connection setup functions
  const handleGetTemporaryCode = async () => {
    if (!finalConfig) return;

    setIsLoadingConnection(true);
    setConnectionError('');

    try {
      const result = await AccountsService.getTemporaryCode(finalConfig);
      setTemporaryCode(result.code);

      // Build the webview URL
      const url = AccountsService.buildWebviewUrl(finalConfig.clientId, result.code, finalConfig);
      setWebviewUrl(url);
      setSuccess('Temporary code generated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get temporary code';
      setConnectionError(`Failed to get temporary code: ${errorMessage}`);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  const handleOpenWebview = () => {
    if (webviewUrl) {
      window.open(webviewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

      // Reset the temporary code state since it's single-use
      // This will show the "Get Temporary Code" button again
      setTemporaryCode('');
      setWebviewUrl('');
      setSuccess('Connection page opened. You can generate a new temporary code if needed.');
    }
  };

  // Simplified one-click connection flow for the wizard
  const handleOneClickBankConnection = async () => {
    if (!finalConfig) return;

    setIsLoadingConnection(true);
    setConnectionError('');

    try {
      // Use the unified service method to get code and URL directly
      const lang = getCurrentLanguage();

      const result = await AccountsService.getConnectionUrlDirectly(
        finalConfig,
        undefined, // No connection ID for new connections
        'connect',
        lang
      );

      // Store the code/URL and immediately open the webview
      setTemporaryCode(result.code);
      setWebviewUrl(result.url);

      // Open the webview directly with close detection
      const popup = AccountsService.openConnectionWebview(result.url, () => {
        // Popup was closed - refresh connections
        setSuccess(t('checking_new_connections', 'Checking for new connections...'));
        setConnectionError('');

        // Refresh connections after popup closes
        setTimeout(() => {
          if (finalConfig) {
            checkExistingConnections(finalConfig);
          }
          // Reset the state so user can create another connection if needed
          setTemporaryCode('');
          setWebviewUrl('');
          setConnectionError('');
          setSuccess(
            t(
              'connection_interface_closed',
              'Connection interface closed. You can add another connection if needed.'
            )
          );
        }, 1000);
      });

      if (popup) {
        setSuccess(
          t(
            'connection_opened_successfully',
            "Connection interface opened successfully! Close the popup when you're done to refresh the connections list."
          )
        );
      } else {
        setConnectionError(
          t(
            'popup_blocked_message',
            'Popup was blocked. Please allow popups for this site and try again.'
          )
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('errors:unknown_error', 'Unknown error');
      setConnectionError(
        t('failed_to_open_connection', `Failed to open connection interface: ${errorMessage}`)
      );
    } finally {
      setIsLoadingConnection(false);
    }
  };

  const handleSkipConnections = () => {
    if (finalConfig) {
      onComplete(finalConfig);
    }
  };

  const handleCompleteSetup = () => {
    if (finalConfig) {
      onComplete(finalConfig);
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

  const renderConnectionsStep = () => (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>🏦 Bank Connections Setup</h3>
        <p>
          You can now add bank connections through Powens to access your accounts. This step is
          optional and you can add connections later from the connection manager.
        </p>
      </div>

      {/* Show existing connections if any */}
      {isLoadingConnections ? (
        <div className={styles.loadingConnections}>
          <p>🔄 Checking for existing connections...</p>
        </div>
      ) : existingConnections.length > 0 ? (
        <div className={styles.existingConnections}>
          <h4>✅ Existing Connections Found</h4>
          <p>You already have {existingConnections.length} bank connection(s) configured:</p>
          <div className={styles.connectionsList}>
            {existingConnections.map((connection, index) => (
              <div key={connection.id || index} className={styles.connectionItem}>
                <span className={styles.bankName}>{getBankName(connection)}</span>
                <span className={styles.connectionStatus}>
                  {connection.error ? '❌ Error' : '✅ Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Check if advanced mode is enabled */}
      {isAdvancedConnectionStepsEnabled() ? (
        // Advanced mode: Show traditional two-step flow
        !temporaryCode ? (
          <div className={styles.connectionSetup}>
            <div className={styles.infoBox}>
              <h4>
                🔗 Add {existingConnections.length > 0 ? 'Another' : 'Your First'} Bank Connection
              </h4>
              <p>
                Click the button below to generate a temporary code and open the Powens connection
                interface where you can securely connect your bank accounts.
              </p>
            </div>

            {connectionError && <div className={styles.error}>❌ {connectionError}</div>}

            <div className={styles.connectionActions}>
              <button
                onClick={handleGetTemporaryCode}
                disabled={isLoadingConnection}
                className={styles.btnNext}
                type="button"
              >
                {isLoadingConnection ? '🔄 Generating...' : '🔑 Get Temporary Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.connectionSetup}>
            <div className={styles.connectionDetails}>
              <div className={styles.formGroup}>
                <label>Temporary Code:</label>
                <div className={styles.codeValue}>
                  <code>{temporaryCode}</code>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Connection URL:</label>
                <div className={styles.urlValue}>
                  <code>{webviewUrl}</code>
                </div>
              </div>
            </div>

            <div className={styles.connectionActions}>
              <button onClick={handleOpenWebview} className={styles.btnNext} type="button">
                🌐 Open Connection Page
              </button>
            </div>
          </div>
        )
      ) : (
        // Simplified mode: One-click connection
        <div className={styles.connectionSetup}>
          <div className={styles.infoBox}>
            <h4>
              🔗 Add {existingConnections.length > 0 ? 'Another' : 'Your First'} Bank Connection
            </h4>
            <p>
              {t(
                'one_click_connection_info',
                'Click the button below to automatically generate a temporary code and open the connection interface'
              )}
            </p>
          </div>

          {connectionError && <div className={styles.error}>❌ {connectionError}</div>}

          <div className={styles.connectionActions}>
            <button
              onClick={handleOneClickBankConnection}
              disabled={isLoadingConnection}
              className={styles.btnNext}
              type="button"
            >
              {isLoadingConnection
                ? t('connecting_to_bank', '🔄 Connecting...')
                : t('add_bank_connection', '🏦 Add Bank Connection')}
            </button>
          </div>
        </div>
      )}

      <div className={styles.stepActions}>
        <button onClick={handleBack} className={styles.btnBack} type="button">
          {t('common:back')}
        </button>
        <button onClick={handleSkipConnections} className={styles.btnCancel} type="button">
          Skip for Now
        </button>
        <button onClick={handleCompleteSetup} className={styles.btnNext} type="button">
          ✅ Complete Setup
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
              className={`${styles.stepDot} ${currentStep === 'users' ? styles.active : currentStep === 'configure' || currentStep === 'connections' ? styles.completed : ''}`}
            >
              2
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${currentStep === 'configure' ? styles.active : currentStep === 'connections' ? styles.completed : ''}`}
            >
              3
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${currentStep === 'connections' ? styles.active : ''}`}
            >
              4
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>❌ {error}</div>}

        {success && <div className={styles.success}>✅ {success}</div>}

        {currentStep === 'basic' && renderBasicStep()}
        {currentStep === 'users' && renderUsersStep()}
        {currentStep === 'configure' && renderConfigureStep()}
        {currentStep === 'connections' && renderConnectionsStep()}
      </div>
    </div>
  );
};
