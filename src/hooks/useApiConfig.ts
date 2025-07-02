import { useState, useEffect } from 'react';
import { ApiConfig, defaultApiConfig } from '../config/api';
import { AccountsService } from '../services/accountsService';

export const useApiConfig = () => {
  const [apiConfig, setApiConfig] = useState<ApiConfig>(defaultApiConfig);

  // Load API config from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apiConfig');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        const updatedConfig = {
          mode: savedConfig.mode || 'mock',
          apiUrl: savedConfig.apiUrl || '',
          userId: savedConfig.userId || '',
          bearerToken: savedConfig.bearerToken || '',
          apiVersion: '2.0',
          clientId: savedConfig.clientId || '',
        };
        setApiConfig(updatedConfig);
        AccountsService.setConfig(updatedConfig);
      }
    } catch (error) {
      console.error('Error loading saved API configuration:', error);
    }
  }, []);

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
