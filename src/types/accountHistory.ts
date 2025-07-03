export interface AccountHistoryEntry {
  accountId: number;
  date: string; // YYYY-MM-DD format
  balance: number;
  userId: number;
}

export interface AccountHistorySettings {
  enabled: boolean;
  selectedAccounts: number[];
  preferredChartType: ChartType;
  userId: number;
}

export type ChartType = 'multiColumn' | 'stacked' | 'area' | 'line';
