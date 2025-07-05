import { useState, useEffect, useCallback } from 'react';
import { Account } from '../types/accounts';
import { AccountHistoryEntry, ChartType } from '../types/accountHistory';
import { AccountHistoryService } from '../services/accountHistoryService';
import { UserService } from '../services/userService';

export const useAccountHistory = () => {
  const [isEnabled, setIsEnabled] = useState(AccountHistoryService.isEnabled());
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [preferredChartType, setPreferredChartType] = useState<ChartType>('line');
  const [history, setHistory] = useState<AccountHistoryEntry[]>([]);

  const activeUser = UserService.getActiveUser();
  const userId = activeUser?.id || 0;

  // Load user settings when user changes
  useEffect(() => {
    if (userId > 0) {
      const userSelectedAccounts = AccountHistoryService.getSelectedAccounts(userId);
      const userChartType = AccountHistoryService.getPreferredChartType(userId);

      setSelectedAccounts(userSelectedAccounts);
      setPreferredChartType(userChartType);
    }
  }, [userId]);

  // Load history data when user or selected accounts change
  useEffect(() => {
    if (userId > 0) {
      const historyData = AccountHistoryService.getHistoryForSelectedAccounts(userId);
      setHistory(historyData);
    } else {
      setHistory([]);
    }
  }, [userId, selectedAccounts]);

  const recordAccountValues = useCallback(
    (accounts: Account[]) => {
      if (userId > 0 && isEnabled) {
        AccountHistoryService.recordDailyValues(accounts, userId);
        // Refresh history after recording
        const updatedHistory = AccountHistoryService.getHistoryForSelectedAccounts(userId);
        setHistory(updatedHistory);
      }
    },
    [userId, isEnabled]
  );

  const toggleEnabled = useCallback((enabled: boolean) => {
    AccountHistoryService.setEnabled(enabled);
    setIsEnabled(enabled);
    if (!enabled) {
      setHistory([]);
      setSelectedAccounts([]);
    }
  }, []);

  const updateSelectedAccounts = useCallback(
    (accountIds: number[]) => {
      if (userId > 0) {
        AccountHistoryService.setSelectedAccounts(userId, accountIds);
        setSelectedAccounts(accountIds);
        // Refresh history with new selection
        const updatedHistory = AccountHistoryService.getHistoryForSelectedAccounts(userId);
        setHistory(updatedHistory);
      }
    },
    [userId]
  );

  const updatePreferredChartType = useCallback(
    (chartType: ChartType) => {
      if (userId > 0) {
        AccountHistoryService.setPreferredChartType(userId, chartType);
        setPreferredChartType(chartType);
      }
    },
    [userId]
  );

  const clearUserHistory = useCallback(() => {
    if (userId > 0) {
      AccountHistoryService.clearUserHistory(userId);
      setHistory([]);
      setSelectedAccounts([]);
      setPreferredChartType('line');
    }
  }, [userId]);

  const getHistoryForPeriod = useCallback(
    (startDate: string, endDate: string) => {
      if (userId > 0) {
        return AccountHistoryService.getHistoryForPeriod(userId, startDate, endDate);
      }
      return [];
    },
    [userId]
  );

  const getHistoryForAccount = useCallback(
    (accountId: number) => {
      if (userId > 0) {
        return AccountHistoryService.getHistoryForAccount(accountId, userId);
      }
      return [];
    },
    [userId]
  );

  const getAvailableDates = useCallback(() => {
    if (userId > 0) {
      return AccountHistoryService.getAvailableDates(userId);
    }
    return [];
  }, [userId]);

  const getEligibleAccounts = useCallback((accounts: Account[]) => {
    return accounts.filter(account => AccountHistoryService.isAccountEligible(account));
  }, []);

  return {
    // State
    isEnabled,
    selectedAccounts,
    preferredChartType,
    history,
    userId,

    // Actions
    recordAccountValues,
    toggleEnabled,
    updateSelectedAccounts,
    updatePreferredChartType,
    clearUserHistory,

    // Data getters
    getHistoryForPeriod,
    getHistoryForAccount,
    getAvailableDates,
    getEligibleAccounts,
  };
};
