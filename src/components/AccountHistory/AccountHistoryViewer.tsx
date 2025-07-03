import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../types/accounts';
import { ChartType } from '../../types/accountHistory';
import { useAccountHistory } from '../../hooks/useAccountHistory';
import { HistoryTable } from './components/HistoryTable';
import { AccountHistoryCharts } from './AccountHistoryCharts';
import { ChartTypeSelector } from './components/ChartTypeSelector';
import styles from './AccountHistoryViewer.module.css';

interface AccountHistoryViewerProps {
  accounts: Account[];
}

type ViewMode = 'table' | 'chart';

export const AccountHistoryViewer: React.FC<AccountHistoryViewerProps> = ({ accounts }) => {
  const { t } = useTranslation('financial');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const {
    selectedAccounts,
    preferredChartType,
    updatePreferredChartType,
    getHistoryForPeriod,
    getAvailableDates,
    getEligibleAccounts,
  } = useAccountHistory();

  const eligibleAccounts = getEligibleAccounts(accounts);
  const selectedAccountsData = eligibleAccounts.filter(account => 
    selectedAccounts.includes(account.id)
  );
  
  const availableDates = getAvailableDates();
  const minDate = availableDates[0] || '';
  const maxDate = availableDates[availableDates.length - 1] || '';

  // Set default date range if not set
  React.useEffect(() => {
    if (!startDate && minDate) {
      setStartDate(minDate);
    }
    if (!endDate && maxDate) {
      setEndDate(maxDate);
    }
  }, [minDate, maxDate, startDate, endDate]);

  const filteredHistory = useMemo(() => {
    if (!startDate || !endDate) {
      return [];
    }
    return getHistoryForPeriod(startDate, endDate);
  }, [getHistoryForPeriod, startDate, endDate]);

  const handleChartTypeChange = (chartType: ChartType) => {
    updatePreferredChartType(chartType);
  };

  if (selectedAccounts.length === 0) {
    return (
      <div className={styles.viewer}>
        <div className={styles.noSelectionMessage}>
          <h3>{t('no_accounts_selected')}</h3>
          <p>{t('no_accounts_selected_description')}</p>
        </div>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className={styles.viewer}>
        <div className={styles.noDataMessage}>
          <h3>{t('no_history_data')}</h3>
          <p>{t('no_history_data_description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.controls}>
        <div className={styles.dateRange}>
          <div className={styles.dateInput}>
            <label htmlFor="startDate" className={styles.dateLabel}>
              {t('start_date')}
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className={styles.dateField}
            />
          </div>
          <div className={styles.dateInput}>
            <label htmlFor="endDate" className={styles.dateLabel}>
              {t('end_date')}
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className={styles.dateField}
            />
          </div>
        </div>

        <div className={styles.viewModeToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'chart' ? styles.active : ''}`}
            onClick={() => setViewMode('chart')}
          >
            {t('chart_view')}
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'table' ? styles.active : ''}`}
            onClick={() => setViewMode('table')}
          >
            {t('table_view')}
          </button>
        </div>
      </div>

      {viewMode === 'chart' && (
        <div className={styles.chartSection}>
          <ChartTypeSelector
            selectedType={preferredChartType}
            onTypeChange={handleChartTypeChange}
          />
          <AccountHistoryCharts
            history={filteredHistory}
            accounts={selectedAccountsData}
            chartType={preferredChartType}
          />
        </div>
      )}

      {viewMode === 'table' && (
        <div className={styles.tableSection}>
          <HistoryTable
            history={filteredHistory}
            accounts={selectedAccountsData}
          />
        </div>
      )}

    </div>
  );
};
