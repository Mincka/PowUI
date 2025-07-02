import { useAppData } from '../contexts/AppDataContext';
import { ApiConfig } from '../config/api';

interface UseAccountsDataReturn {
  data: import('../types/accounts').AccountsResponse | null;
  loading: boolean;
  configLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  handleConfigChange: (config: ApiConfig) => Promise<void>;
}

export const useAccountsData = (): UseAccountsDataReturn => {
  const { accountsData, isLoading, configLoading, error, refetch, handleConfigChange } =
    useAppData();

  return {
    data: accountsData,
    loading: isLoading,
    configLoading,
    error,
    refetch,
    handleConfigChange,
  };
};
