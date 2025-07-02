import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PowensUser, CombinedUserData } from '../../types/accounts';
import { UserService } from '../../services/userService';
import { ApiConfig } from '../../config/api';
import styles from './UserManager.module.css';

interface UserManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onUserSwitch: (user: PowensUser) => void;
  currentConfig: ApiConfig;
}

export const UserManager: React.FC<UserManagerProps> = ({
  isVisible,
  onClose,
  onUserSwitch,
  currentConfig,
}) => {
  const { t } = useTranslation('api');
  const [combinedUsers, setCombinedUsers] = useState<CombinedUserData[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConfigureForm, setShowConfigureForm] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState<number | null>(null);
  const [showRenewDialog, setShowRenewDialog] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState(() => {
    // Get client secret from current config
    return currentConfig.clientSecret || '';
  });
  const [usersToken, setUsersToken] = useState(() => {
    // Get users token from current config
    return currentConfig.usersToken || '';
  });
  const [userName, setUserName] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [_revokePrevious, setRevokePrevious] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isRenewing, setIsRenewing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Save Users token to localStorage whenever it changes
  useEffect(() => {
    if (usersToken.trim()) {
      try {
        localStorage.setItem('powensUsersToken', usersToken);
      } catch (error) {
        console.warn('Failed to save Users token to localStorage:', error);
      }
    }
  }, [usersToken]);

  const loadUsers = useCallback(async () => {
    if (!usersToken.trim()) {
      // If we don't have Users token, just show local users
      const storedUsers = UserService.getStoredUsers();
      const combinedData: CombinedUserData[] = storedUsers.map(localUser => ({
        apiUser: { id: localUser.id },
        localUser,
        isConfigured: true,
      }));
      setCombinedUsers(combinedData);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const combined = await UserService.getCombinedUsersData(usersToken.trim(), currentConfig);
      setCombinedUsers(combined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);

      // Fallback to showing only local users
      const storedUsers = UserService.getStoredUsers();
      const combinedData: CombinedUserData[] = storedUsers.map(localUser => ({
        apiUser: { id: localUser.id },
        localUser,
        isConfigured: true,
      }));
      setCombinedUsers(combinedData);
    } finally {
      setIsLoading(false);
    }
  }, [usersToken, currentConfig]);

  // Update tokens when currentConfig changes
  useEffect(() => {
    setClientSecret(currentConfig.clientSecret || '');
    setUsersToken(currentConfig.usersToken || '');
  }, [currentConfig.clientSecret, currentConfig.usersToken]);

  // Load users when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadUsers();
      setError(null);
      setSuccess(null);
    }
  }, [isVisible, loadUsers]);

  const handleCreateUser = async () => {
    if (!currentConfig.clientId || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const newUser = await UserService.createUser(
        currentConfig.clientId,
        clientSecret.trim(),
        currentConfig
      );

      // Update display name if provided
      if (userName.trim()) {
        UserService.updateUserName(newUser.id, userName.trim());
        newUser.name = userName.trim();
      }

      // Refresh users list
      await loadUsers();

      // Clear form
      setUserName('');
      setShowCreateForm(false);

      setSuccess(`User ${newUser.name} created successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfigureUser = (userId: number) => {
    setShowConfigureForm(userId);
    setUserName('');
    setAuthToken('');
    setError(null);
    setSuccess(null);
  };

  const handleSaveConfiguration = () => {
    if (!authToken.trim()) {
      setError('Auth Token is required');
      return;
    }

    if (showConfigureForm === null) return;

    try {
      const configuredUser = UserService.configureUser(
        showConfigureForm,
        authToken.trim(),
        userName.trim() || `User ${showConfigureForm}`
      );

      // If no user is currently active, set this user as active
      const activeUser = UserService.getActiveUser();
      if (!activeUser) {
        UserService.setActiveUser(configuredUser.id);
        onUserSwitch(configuredUser);
      }

      // Refresh users list
      loadUsers();

      // Clear form
      setShowConfigureForm(null);
      setUserName('');
      setAuthToken('');

      setSuccess(`User ${configuredUser.name} configured successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure user';
      setError(errorMessage);
    }
  };

  const handleSwitchUser = (userData: CombinedUserData) => {
    if (!userData.localUser) {
      setError('User is not configured. Please configure it first.');
      return;
    }

    try {
      // Set this user as active
      UserService.setActiveUser(userData.localUser.id);

      // Refresh users list
      loadUsers();

      // Notify parent component
      onUserSwitch(userData.localUser);

      setSuccess(`Switched to user: ${userData.localUser.name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch user';
      setError(errorMessage);
    }
  };

  const handleDeleteUser = async (userData: CombinedUserData) => {
    const userDisplayName = userData.localUser?.name || `User ${userData.apiUser.id}`;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "${userDisplayName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(userData.apiUser.id);
    setError(null);
    setSuccess(null);

    try {
      // If user is configured locally, use their auth token
      if (userData.isConfigured && userData.localUser?.authToken) {
        await UserService.deleteUser(
          userData.apiUser.id,
          userData.localUser.authToken,
          currentConfig
        );
      } else {
        // If user is not configured or missing auth token, use renewal method
        if (!currentConfig.clientId || !clientSecret.trim()) {
          setError('Client Secret is required to delete unconfigured users');
          return;
        }

        await UserService.deleteUserWithRenewal(
          userData,
          currentConfig.clientId,
          clientSecret.trim(),
          currentConfig
        );
      }

      // Close any open panels for the deleted user
      if (showConfigureForm === userData.apiUser.id) {
        setShowConfigureForm(null);
        setUserName('');
        setAuthToken('');
      }
      if (showEditForm === userData.apiUser.id) {
        setShowEditForm(null);
        setUserName('');
        setAuthToken('');
      }
      if (showRenewDialog === userData.apiUser.id) {
        setShowRenewDialog(null);
        setRevokePrevious(false);
      }

      // Refresh users list
      await loadUsers();

      setSuccess(`User ${userDisplayName} deleted successfully!`);

      // If we deleted the active user, we need to handle that
      if (userData.localUser?.isActive) {
        const remainingUsers = UserService.getStoredUsers();
        if (remainingUsers.length > 0) {
          // Automatically switch to the first available user
          const firstUser = remainingUsers[0];
          UserService.setActiveUser(firstUser.id);
          onUserSwitch(firstUser);
          loadUsers();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditUser = (userData: CombinedUserData) => {
    setShowEditForm(userData.apiUser.id);
    setUserName(userData.localUser?.name || '');
    setAuthToken(userData.localUser?.authToken || '');
    setError(null);
    setSuccess(null);
  };

  const handleSaveEdit = () => {
    if (showEditForm === null) return;

    try {
      const existingUser = combinedUsers.find(u => u.apiUser.id === showEditForm);

      if (existingUser?.isConfigured && existingUser.localUser) {
        // Update existing user
        if (userName.trim()) {
          UserService.updateUserName(showEditForm, userName.trim());
        }
        if (authToken.trim() && authToken.trim() !== existingUser.localUser.authToken) {
          // Update auth token
          const updatedUser: PowensUser = {
            ...existingUser.localUser,
            authToken: authToken.trim(),
            name: userName.trim() || existingUser.localUser.name,
          };
          UserService.addUser(updatedUser);
        }
      } else {
        // Configure new user
        if (authToken.trim()) {
          UserService.configureUser(
            showEditForm,
            authToken.trim(),
            userName.trim() || `User ${showEditForm}`
          );
        } else if (userName.trim()) {
          // Just update name without auth token - create placeholder
          UserService.configureUser(
            showEditForm,
            '', // Empty auth token for now
            userName.trim()
          );
        }
      }

      // Refresh users list
      loadUsers();

      // Clear form
      setShowEditForm(null);
      setUserName('');
      setAuthToken('');

      setSuccess(`User updated successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
    }
  };

  const handleGenerateToken = async (userId: number) => {
    if (!currentConfig.clientId || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required to generate tokens');
      return;
    }

    // Show confirmation dialog with revoke option
    const shouldRevoke = window.confirm(
      'Do you want to revoke all previous tokens for this user?\n\n' +
        'Click "OK" to revoke previous tokens (recommended for security)\n' +
        'Click "Cancel" to keep existing tokens'
    );

    setIsRenewing(userId);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await UserService.renewAndUpdateToken(
        userId,
        currentConfig.clientId,
        clientSecret.trim(),
        currentConfig,
        shouldRevoke
      );

      // Update the auth token field with the new token
      setAuthToken(updatedUser.authToken);
      setSuccess(
        `Token generated for user ${userId}${shouldRevoke ? ' (previous tokens revoked)' : ''}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate token';
      setError(errorMessage);
    } finally {
      setIsRenewing(null);
    }
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setShowConfigureForm(null);
    setClientSecret('');
    setUserName('');
    setAuthToken('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isVisible) return null;

  const canCreateUser = currentConfig.clientId && clientSecret.trim();
  const hasUsers = combinedUsers.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{t('user_management')}</h3>
          <button onClick={handleClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.info}>
          <strong>{t('common:information')}:</strong> {t('user_management_info')}
        </div>

        {/* Refresh Users */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('refresh_users')}</div>
          <button
            onClick={loadUsers}
            className={styles.btnRefresh}
            disabled={!usersToken.trim() || isLoading}
          >
            {isLoading ? t('loading_users') : t('refresh_users_list')}
          </button>
          {(!usersToken.trim() || !clientSecret.trim()) && (
            <div className={styles.warning}>
              <strong>{t('incomplete_configuration')}</strong> {t('configure_api_credentials')}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('powens_users')}</div>

          {isLoading ? (
            <div className={styles.loading}>{t('loading_users')}</div>
          ) : hasUsers ? (
            <div className={styles.usersList}>
              {combinedUsers.map(userData => (
                <div
                  key={userData.apiUser.id}
                  className={`${styles.userItem} ${userData.localUser?.isActive ? styles.active : ''} ${!userData.isConfigured ? styles.unconfigured : ''}`}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {userData.isConfigured
                        ? userData.localUser?.name || `User ${userData.apiUser.id}`
                        : t('unknown_user', { id: userData.apiUser.id })}
                      {userData.localUser?.isActive && (
                        <span className={styles.activeIndicator}>{t('active_status')}</span>
                      )}
                      {!userData.isConfigured && (
                        <span className={styles.unconfiguredIndicator}>{t('not_configured')}</span>
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      ID: {userData.apiUser.id}
                      {userData.localUser && (
                        <>
                          {' • '}
                          {t('type')}: {userData.localUser.type}
                          {' • '}
                          {t('configured')}:{' '}
                          {new Date(userData.localUser.createdAt).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.userActions}>
                    {userData.isConfigured ? (
                      <>
                        <button
                          onClick={() => handleSwitchUser(userData)}
                          className={`${styles.btnPrimary} ${userData.localUser?.isActive ? styles.btnCurrent : ''}`}
                          disabled={userData.localUser?.isActive}
                        >
                          {userData.localUser?.isActive ? t('current') : t('use')}
                        </button>
                        <button
                          onClick={() => handleEditUser(userData)}
                          className={styles.btnSecondary}
                          title={t('edit_name_token')}
                        >
                          {t('common:edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userData)}
                          className={styles.btnDanger}
                          disabled={isDeleting === userData.apiUser.id}
                          title={t('common:delete')}
                        >
                          {isDeleting === userData.apiUser.id ? '⏳' : '🗑️'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConfigureUser(userData.apiUser.id)}
                          className={styles.btnPrimary}
                        >
                          {t('configure')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userData)}
                          className={styles.btnDanger}
                          disabled={isDeleting === userData.apiUser.id}
                          title={t('common:delete')}
                        >
                          {isDeleting === userData.apiUser.id ? '⏳' : '🗑️'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              {usersToken.trim() ? t('no_users_found') : t('enter_users_token')}
            </div>
          )}
        </div>

        {/* Configure User Form */}
        {showConfigureForm !== null && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {t('configure_user', { id: showConfigureForm })}
            </div>
            <div className={styles.configPanel}>
              <div className={styles.formGroup}>
                <label htmlFor="configure-user-name">{t('forms:display_name')}</label>
                <input
                  id="configure-user-name"
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder={t('user_name_placeholder')}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="configure-auth-token">{t('auth_token_required')}</label>
                <div className={styles.tokenInputGroup}>
                  <input
                    id="configure-auth-token"
                    type={showAuthToken ? 'text' : 'password'}
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    placeholder={t('auth_token_placeholder')}
                    className={authToken.trim() ? styles.valid : styles.invalid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    className={styles.toggleVisibility}
                    title={showAuthToken ? t('common:hide') : t('common:show')}
                  >
                    {showAuthToken ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateToken(showConfigureForm)}
                    className={styles.generateTokenBtn}
                    disabled={!clientSecret.trim() || isRenewing === showConfigureForm}
                    title={!clientSecret.trim() ? t('client_secret_required') : t('generate_token')}
                  >
                    {isRenewing === showConfigureForm ? '⏳' : '🔄'}
                  </button>
                </div>
                <div className={styles.tokenHelp}>{t('token_generate_help')}</div>
              </div>

              <div className={styles.formActions}>
                <button
                  onClick={() => {
                    setShowConfigureForm(null);
                    setUserName('');
                    setAuthToken('');
                  }}
                  className={styles.btnCancel}
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleSaveConfiguration}
                  className={styles.btnCreate}
                  disabled={!authToken.trim()}
                >
                  {t('common:save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Form */}
        {showEditForm !== null && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('edit_user', { id: showEditForm })}</div>
            <div className={styles.configPanel}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-user-name">{t('forms:display_name')}</label>
                <input
                  id="edit-user-name"
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder={t('user_name_placeholder')}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-auth-token">{t('auth_token')}</label>
                <div className={styles.tokenInputGroup}>
                  <input
                    id="edit-auth-token"
                    type={showAuthToken ? 'text' : 'password'}
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    placeholder={t('auth_token_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    className={styles.toggleVisibility}
                    title={showAuthToken ? t('common:hide') : t('common:show')}
                  >
                    {showAuthToken ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateToken(showEditForm)}
                    className={styles.generateTokenBtn}
                    disabled={!clientSecret.trim() || isRenewing === showEditForm}
                    title={
                      !clientSecret.trim() ? t('client_secret_required') : t('regenerate_token')
                    }
                  >
                    {isRenewing === showEditForm ? '⏳' : '🔄'}
                  </button>
                </div>
                <div className={styles.tokenHelp}>{t('token_regenerate_help')}</div>
              </div>

              <div className={styles.formActions}>
                <button
                  onClick={() => {
                    setShowEditForm(null);
                    setUserName('');
                    setAuthToken('');
                  }}
                  className={styles.btnCancel}
                >
                  {t('common:cancel')}
                </button>
                <button onClick={handleSaveEdit} className={styles.btnCreate}>
                  {t('common:save')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('create_new_user')}</div>

          {!showCreateForm ? (
            <button onClick={() => setShowCreateForm(true)} className={styles.toggleCreateForm}>
              <span>+</span>
              {t('new_user')}
            </button>
          ) : (
            <div className={styles.createUserForm}>
              <div className={styles.formGroup}>
                <label htmlFor="create-user-name">{t('display_name_optional')}</label>
                <input
                  id="create-user-name"
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder={t('user_name_placeholder')}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setUserName('');
                  }}
                  className={styles.btnCancel}
                  disabled={isCreating}
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleCreateUser}
                  className={styles.btnCreate}
                  disabled={!canCreateUser || isCreating}
                >
                  {isCreating ? t('creating_user') : t('create_user')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
