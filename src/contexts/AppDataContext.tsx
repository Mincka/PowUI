import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { AccountsResponse, Connection, Account } from '../types/accounts';
import { AccountsService } from '../services/accountsService';
import { ApiConfig } from '../config/api';
import { deduplicateAccounts } from '../utils/accountDeduplication';

interface AppDataState {
  accounts: Account[];
  connections: Connection[];
  accountsData: AccountsResponse | null;
  isLoading: boolean;
  isLoadingAccounts: boolean;
  isLoadingConnections: boolean;
  configLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

interface AppDataContextType extends AppDataState {
  fetchData: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchConnections: () => Promise<void>;
  handleConfigChange: (config: ApiConfig) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
  updateConnection: (connection: Connection) => void;
  removeConnection: (connectionId: number) => void;
  updateAccounts: (accounts: Account[]) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

interface AppDataProviderProps {
  children: ReactNode;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children }) => {
  const CACHE_DURATION = 30000; // 30 seconds cache
  const REQUEST_DEBOUNCE_TIME = 100; // 100ms debounce
  const [state, setState] = useState<AppDataState>({
    accounts: [],
    connections: [],
    accountsData: null,
    isLoading: true,
    isLoadingAccounts: false,
    isLoadingConnections: false,
    configLoading: false,
    error: null,
    lastFetch: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const fetchAccounts = useCallback(async (): Promise<void> => {
    // Check cache validity by reading current state
    setState(prev => {
      const now = Date.now();
      if (prev.lastFetch && now - prev.lastFetch < CACHE_DURATION && prev.accountsData) {
        return prev; // No change, cache is valid
      }
      return { ...prev, isLoadingAccounts: true, error: null };
    });

    try {
      // Try to fetch from API first, fallback to mock data
      let accountsData: AccountsResponse;
      try {
        accountsData = await AccountsService.fetchAccounts();
        accountsData.accounts = deduplicateAccounts(accountsData.accounts);
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';

        // Check if it's a configuration or authentication error
        if (
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('Resource not found') ||
          errorMessage.includes('Forbidden')
        ) {
          // Don't fallback to mock data for auth/config errors, show the error
          throw new Error(`API Error: ${errorMessage}`);
        }

        // For network or other errors, fallback to mock data only if mode is 'mock'
        const apiConfigRaw = localStorage.getItem('apiConfig');
        let mode = 'mock';
        if (apiConfigRaw) {
          try {
            mode = JSON.parse(apiConfigRaw).mode || 'mock';
          } catch {
            // Ignore JSON parsing errors, use default mode
          }
        }
        if (mode === 'mock') {
          console.warn('API call failed, using mock data:', apiError);
          accountsData = AccountsService.getMockData();
          accountsData.accounts = deduplicateAccounts(accountsData.accounts);
        } else {
          throw new Error(`API Error: ${errorMessage}`);
        }
      }

      setState(prev => {
        // Check if we should update (cache might have been valid)
        if (prev.isLoadingAccounts) {
          const now = Date.now();
          return {
            ...prev,
            accountsData,
            accounts: accountsData.accounts,
            lastFetch: now,
            isLoadingAccounts: false,
            error: null,
          };
        }
        return prev;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors du chargement des comptes';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoadingAccounts: false,
      }));
      console.error('Error loading accounts:', err);
    }
  }, []);

  const fetchConnections = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoadingConnections: true }));

    try {
      const response = await AccountsService.fetchConnections();
      setState(prev => ({
        ...prev,
        connections: response.connections,
        isLoadingConnections: false,
      }));
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch connections';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoadingConnections: false,
      }));
    }
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch both accounts and connections in parallel
      await Promise.all([fetchAccounts(), fetchConnections()]);
    } catch (error) {
      // Errors are already handled in individual fetch functions
      console.error('Error in fetchData:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchAccounts, fetchConnections]);

  const handleConfigChange = useCallback(
    async (apiConfig: ApiConfig): Promise<void> => {
      clearError(); // Clear any previous errors

      // Check the mode and handle data loading accordingly
      if (apiConfig.mode === 'mock') {
        // Use mock data directly - no loading state needed
        const mockData = AccountsService.getMockData();
        mockData.accounts = deduplicateAccounts(mockData.accounts);
        setState(prev => ({
          ...prev,
          accountsData: mockData,
          accounts: mockData.accounts,
          configLoading: false,
          lastFetch: Date.now(),
        }));
        return;
      }

      // Otherwise refetch data with new configuration
      // Use configLoading instead of loading to keep the UI visible
      setState(prev => ({ ...prev, configLoading: true }));

      try {
        // Reset cache to force fresh data with new config
        setState(prev => ({ ...prev, lastFetch: null }));

        // Fetch fresh data
        await fetchData();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors du chargement des données';
        setState(prev => ({ ...prev, error: errorMessage }));
        console.error('Error loading data with new config:', err);
      } finally {
        setState(prev => ({ ...prev, configLoading: false }));
      }
    },
    [clearError, fetchData]
  );

  const refetch = useCallback(async (): Promise<void> => {
    // Reset cache to force fresh data
    setState(prev => ({ ...prev, lastFetch: null }));
    await fetchData();
  }, [fetchData]);

  const updateConnection = useCallback((connection: Connection) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.map(conn => (conn.id === connection.id ? connection : conn)),
    }));
  }, []);

  const removeConnection = useCallback((connectionId: number) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      accounts: prev.accounts.filter(account => account.id_connection !== connectionId),
    }));
  }, []);

  const updateAccounts = useCallback((accounts: Account[]) => {
    setState(prev => ({
      ...prev,
      accounts,
      accountsData: prev.accountsData ? { ...prev.accountsData, accounts } : null,
    }));
  }, []);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    let mounted = true;

    const initialFetch = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch both accounts and connections in parallel
        await Promise.all([
          (async () => {
            try {
              const accountsData = await AccountsService.fetchAccounts();
              accountsData.accounts = deduplicateAccounts(accountsData.accounts);
              if (mounted) {
                setState(prev => ({
                  ...prev,
                  accountsData,
                  accounts: accountsData.accounts,
                  lastFetch: Date.now(),
                  isLoadingAccounts: false,
                }));
              }
            } catch (error) {
              // Only use mock data if mode is 'mock'
              const apiConfigRaw = localStorage.getItem('apiConfig');
              let mode = 'mock';
              if (apiConfigRaw) {
                try {
                  mode = JSON.parse(apiConfigRaw).mode || 'mock';
                } catch {
                  // Ignore JSON parsing errors, use default mode
                }
              }
              if (mode === 'mock') {
                console.warn('API call failed, using mock data:', error);
                const mockData = AccountsService.getMockData();
                mockData.accounts = deduplicateAccounts(mockData.accounts);
                if (mounted) {
                  setState(prev => ({
                    ...prev,
                    accountsData: mockData,
                    accounts: mockData.accounts,
                    lastFetch: Date.now(),
                    isLoadingAccounts: false,
                  }));
                }
              } else {
                const errorMessage =
                  error instanceof Error ? error.message : 'Erreur lors du chargement des comptes';
                if (mounted) {
                  setState(prev => ({
                    ...prev,
                    error: errorMessage,
                    isLoadingAccounts: false,
                  }));
                }
              }
            }
          })(),
          (async () => {
            try {
              const response = await AccountsService.fetchConnections();
              if (mounted) {
                setState(prev => ({
                  ...prev,
                  connections: response.connections,
                  isLoadingConnections: false,
                }));
              }
            } catch (error) {
              console.error('Failed to fetch connections:', error);
              if (mounted) {
                setState(prev => ({
                  ...prev,
                  isLoadingConnections: false,
                }));
              }
            }
          })(),
        ]);
      } catch (error) {
        console.error('Error in initial fetch:', error);
      } finally {
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    const timer = setTimeout(initialFetch, REQUEST_DEBOUNCE_TIME);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // Empty dependency array - only run once

  const contextValue: AppDataContextType = {
    ...state,
    fetchData,
    fetchAccounts,
    fetchConnections,
    handleConfigChange,
    refetch,
    clearError,
    updateConnection,
    removeConnection,
    updateAccounts,
  };

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
