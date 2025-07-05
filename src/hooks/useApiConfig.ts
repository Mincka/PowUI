import { useState, useEffect, useCallback } from 'react';
import { ApiConfig, defaultApiConfig } from '../config/api';
import { AccountsService } from '../services/accountsService';
import { UserService } from '../services/userService';

export const useApiConfig = () => {
  const [apiConfig, setApiConfig] = useState<ApiConfig>(defaultApiConfig);

  // Function to sync apiConfig with active user's token
  const syncWithActiveUser = useCallback((config: ApiConfig) => {
    const activeUser = UserService.getActiveUser();
    if (activeUser && config.mode === 'direct') {
      // Update the config if the active user's token differs from the current bearerToken
      if (
        config.userId === activeUser.id.toString() &&
        config.bearerToken !== activeUser.authToken
      ) {
        const updatedConfig = {
          ...config,
          bearerToken: activeUser.authToken,
        };
        return updatedConfig;
      }
    }
    return config;
  }, []);

  // Load API config from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apiConfig');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        let updatedConfig: ApiConfig = {
          mode: savedConfig.mode || 'mock',
          apiUrl: savedConfig.apiUrl || '',
          userId: savedConfig.userId || '',
          bearerToken: savedConfig.bearerToken || '',
          clientId: savedConfig.clientId || '',
          clientSecret: savedConfig.clientSecret,
          usersToken: savedConfig.usersToken,
        };

        // Sync with active user's token if available
        updatedConfig = syncWithActiveUser(updatedConfig);

        setApiConfig(updatedConfig);
        AccountsService.setConfig(updatedConfig);

        // If config was updated with active user's token, save it
        if (updatedConfig.bearerToken !== savedConfig.bearerToken) {
          localStorage.setItem('apiConfig', JSON.stringify(updatedConfig));
        }
      }
    } catch (error) {
      console.error('Error loading saved API configuration:', error);
    }
  }, [syncWithActiveUser]);

  // Check for active user token changes periodically
  useEffect(() => {
    const checkActiveUserToken = () => {
      const activeUser = UserService.getActiveUser();
      if (
        activeUser &&
        apiConfig.mode === 'direct' &&
        apiConfig.userId === activeUser.id.toString()
      ) {
        if (apiConfig.bearerToken !== activeUser.authToken) {
          const updatedConfig = {
            ...apiConfig,
            bearerToken: activeUser.authToken,
          };
          setApiConfig(updatedConfig);
          AccountsService.setConfig(updatedConfig);

          // Save to localStorage
          try {
            localStorage.setItem('apiConfig', JSON.stringify(updatedConfig));
          } catch (error) {
            console.error('Error saving API configuration:', error);
          }
        }
      }
    };

    // Check immediately and then set up interval
    checkActiveUserToken();
    const interval = setInterval(checkActiveUserToken, 1000); // Check every second

    return () => clearInterval(interval);
  }, [apiConfig]);

  const updateConfig = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    AccountsService.setConfig(newConfig);

    // Save to localStorage
    try {
      localStorage.setItem('apiConfig', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving API configuration:', error);
    }
  };

  return {
    apiConfig,
    updateConfig,
  };
};
