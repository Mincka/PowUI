import { Account } from '../types/accounts';
import { AccountHistoryEntry, AccountHistorySettings, ChartType } from '../types/accountHistory';

export class AccountHistoryService {
  private static readonly HISTORY_KEY_PREFIX = 'accountHistory_';
  private static readonly SETTINGS_KEY_PREFIX = 'accountHistorySettings_';
  private static readonly GLOBAL_ENABLED_KEY = 'accountHistoryEnabled';

  /**
   * Check if account history is globally enabled
   */
  static isEnabled(): boolean {
    try {
      const enabled = localStorage.getItem(this.GLOBAL_ENABLED_KEY);
      return enabled !== null ? JSON.parse(enabled) : true; // Default to enabled
    } catch {
      return true;
    }
  }

  /**
   * Set global enabled state
   */
  static setEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(this.GLOBAL_ENABLED_KEY, JSON.stringify(enabled));
      if (!enabled) {
        // Clear all user data when disabled
        this.clearAllData();
      }
    } catch (error) {
      console.error('Failed to save account history enabled state:', error);
    }
  }

  /**
   * Get settings for a specific user
   */
  static getSettingsForUser(userId: number): AccountHistorySettings {
    try {
      const stored = localStorage.getItem(`${this.SETTINGS_KEY_PREFIX}${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load account history settings:', error);
    }

    // Return default settings
    return {
      enabled: true,
      selectedAccounts: [],
      preferredChartType: 'multiColumn',
      userId,
    };
  }

  /**
   * Save settings for a specific user
   */
  static saveSettingsForUser(userId: number, settings: AccountHistorySettings): void {
    try {
      localStorage.setItem(`${this.SETTINGS_KEY_PREFIX}${userId}`, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save account history settings:', error);
    }
  }

  /**
   * Get selected accounts for a user
   */
  static getSelectedAccounts(userId: number): number[] {
    const settings = this.getSettingsForUser(userId);
    return settings.selectedAccounts;
  }

  /**
   * Set selected accounts for a user
   */
  static setSelectedAccounts(userId: number, accountIds: number[]): void {
    const settings = this.getSettingsForUser(userId);
    settings.selectedAccounts = accountIds;
    this.saveSettingsForUser(userId, settings);
  }

  /**
   * Get preferred chart type for a user
   */
  static getPreferredChartType(userId: number): ChartType {
    const settings = this.getSettingsForUser(userId);
    return settings.preferredChartType;
  }

  /**
   * Set preferred chart type for a user
   */
  static setPreferredChartType(userId: number, chartType: ChartType): void {
    const settings = this.getSettingsForUser(userId);
    settings.preferredChartType = chartType;
    this.saveSettingsForUser(userId, settings);
  }

  /**
   * Check if an account should be tracked (exclude cards and loans)
   */
  static isAccountEligible(account: Account): boolean {
    // Exclude cards and accounts with loans
    if (account.type?.toLowerCase().includes('card') || account.loan !== null) {
      return false;
    }
    return true;
  }

  /**
   * Record daily values for accounts
   */
  static recordDailyValues(accounts: Account[], userId: number): void {
    if (!this.isEnabled()) {
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const selectedAccounts = this.getSelectedAccounts(userId);
    
    // Filter accounts to only eligible ones
    const eligibleAccounts = accounts.filter(account => this.isAccountEligible(account));
    
    // If no accounts are selected yet, auto-select all eligible accounts
    if (selectedAccounts.length === 0 && eligibleAccounts.length > 0) {
      const autoSelectedIds = eligibleAccounts.map(account => account.id);
      this.setSelectedAccounts(userId, autoSelectedIds);
    }

    // Get current selection (might have been auto-updated)
    const currentSelection = this.getSelectedAccounts(userId);
    
    // Record history for selected accounts only
    const accountsToRecord = eligibleAccounts.filter(account => 
      currentSelection.includes(account.id)
    );

    if (accountsToRecord.length === 0) {
      return;
    }

    try {
      const existingHistory = this.getAllHistory(userId);
      
      // Remove any existing entries for today (replace if app runs multiple times)
      const filteredHistory = existingHistory.filter(entry => entry.date !== today);
      
      // Add new entries for today
      const newEntries: AccountHistoryEntry[] = accountsToRecord.map(account => ({
        accountId: account.id,
        date: today,
        balance: account.balance,
        userId,
      }));

      const updatedHistory = [...filteredHistory, ...newEntries];
      this.saveHistory(userId, updatedHistory);
    } catch (error) {
      console.error('Failed to record daily account values:', error);
    }
  }

  /**
   * Get all history for a user
   */
  static getAllHistory(userId: number): AccountHistoryEntry[] {
    try {
      const stored = localStorage.getItem(`${this.HISTORY_KEY_PREFIX}${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load account history:', error);
    }
    return [];
  }

  /**
   * Get history for a specific account
   */
  static getHistoryForAccount(accountId: number, userId: number): AccountHistoryEntry[] {
    const allHistory = this.getAllHistory(userId);
    return allHistory.filter(entry => entry.accountId === accountId);
  }

  /**
   * Get history for selected accounts only
   */
  static getHistoryForSelectedAccounts(userId: number): AccountHistoryEntry[] {
    const allHistory = this.getAllHistory(userId);
    const selectedAccounts = this.getSelectedAccounts(userId);
    return allHistory.filter(entry => selectedAccounts.includes(entry.accountId));
  }

  /**
   * Get history for a date range
   */
  static getHistoryForPeriod(
    userId: number,
    startDate: string,
    endDate: string
  ): AccountHistoryEntry[] {
    const allHistory = this.getHistoryForSelectedAccounts(userId);
    return allHistory.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  /**
   * Save history to localStorage
   */
  private static saveHistory(userId: number, history: AccountHistoryEntry[]): void {
    try {
      localStorage.setItem(`${this.HISTORY_KEY_PREFIX}${userId}`, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save account history:', error);
    }
  }

  /**
   * Clear all history for a user
   */
  static clearUserHistory(userId: number): void {
    try {
      localStorage.removeItem(`${this.HISTORY_KEY_PREFIX}${userId}`);
      localStorage.removeItem(`${this.SETTINGS_KEY_PREFIX}${userId}`);
    } catch (error) {
      console.error('Failed to clear user history:', error);
    }
  }

  /**
   * Clear all data for all users
   */
  static clearAllData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.HISTORY_KEY_PREFIX) || key.startsWith(this.SETTINGS_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all account history data:', error);
    }
  }

  /**
   * Get available dates for history
   */
  static getAvailableDates(userId: number): string[] {
    const history = this.getHistoryForSelectedAccounts(userId);
    const dates = [...new Set(history.map(entry => entry.date))];
    return dates.sort();
  }

  /**
   * Get accounts that have history data
   */
  static getAccountsWithHistory(userId: number): number[] {
    const history = this.getHistoryForSelectedAccounts(userId);
    const accountIds = [...new Set(history.map(entry => entry.accountId))];
    return accountIds;
  }
}
