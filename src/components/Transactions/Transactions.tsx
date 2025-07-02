import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, TransactionFilters } from '../../types/transactions';
import { TransactionService } from '../../services/transactionService';
import { formatCurrency } from '../../utils/accountUtils';
import styles from './Transactions.module.css';

interface TransactionsProps {
  accountId: number;
  accountName: string;
}

export const Transactions: React.FC<TransactionsProps> = ({ accountId, accountName }) => {
  const { t } = useTranslation('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<Omit<TransactionFilters, 'accountId' | 'offset'>>({
    limit: 20,
    ...TransactionService.getDefaultDateRange(),
  });

  const formatDate = useMemo(
    () => (dateString: string) => {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    },
    []
  );

  // Use useRef to track if we're already loading to prevent double calls
  const isLoadingRef = React.useRef(false);

  const loadTransactions = useCallback(async (reset = false, currentOffset?: number) => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('Skipping duplicate transaction load call');
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const offsetToUse = reset ? 0 : (currentOffset ?? offset);
      
      console.log('Loading transactions:', { accountId, reset, offsetToUse, filters });
      
      const result = await TransactionService.fetchAccountTransactions(accountId, {
        ...filters,
        offset: offsetToUse,
      });

      const newTransactions = result.transactions;

      if (reset) {
        setTransactions(newTransactions);
        setOffset(newTransactions.length);
      } else {
        setTransactions(prev => [...prev, ...newTransactions]);
        setOffset(prev => prev + newTransactions.length);
      }

      setHasMore(!!result._links.next);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [accountId, filters, offset]);

  useEffect(() => {
    console.log('Transaction useEffect triggered:', { accountId, filters });
    
    // Reset state
    setOffset(0);
    setTransactions([]);
    setHasMore(true);
    setError(null);
    
    // Load transactions after a brief delay to avoid race conditions
    const timeoutId = setTimeout(() => {
      loadTransactions(true, 0);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, filters]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadTransactions();
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilters({
      limit: 20,
      ...TransactionService.getDefaultDateRange(),
    });
    setOffset(0);
  };

  const getBalanceClass = (value: number | null) => {
    if (value === null || value === 0) return styles.balanceZero;
    return value > 0 ? styles.balancePositive : styles.balanceNegative;
  };

  const getTransactionTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      card: '#e74c3c',
      transfer: '#3498db',
      check: '#9b59b6',
      deposit: '#27ae60',
      withdrawal: '#e67e22',
      bank: '#34495e',
      payment: '#e74c3c',
      deferred_card: '#f1c40f',
      market_order: '#2ecc71',
      summary_card: '#8e44ad',
      loan_repayment: '#c0392b',
      market_fee: '#f39c12',
      arbitrage: '#16a085',
      order: '#510a66ff',
      unknown: '#95a5a6',
    };
    return typeColors[type] || typeColors.unknown;
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      card: t('transaction_type_card'),
      transfer: t('transaction_type_transfer'),
      check: t('transaction_type_check'),
      deposit: t('transaction_type_deposit'),
      order: t('transaction_type_order'),
      withdrawal: t('transaction_type_withdrawal'),
      bank: t('transaction_type_bank'),
      payment: t('transaction_type_payment'),
      deferred_card: t('transaction_type_deferred_card'),
      market_order: t('transaction_type_market_order'),
      summary_card: t('transaction_type_summary_card'),
      loan_repayment: t('transaction_type_loan_repayment'),
      market_fee: t('transaction_type_market_fee'),
      arbitrage: t('transaction_type_arbitrage'),
      unknown: t('transaction_type_unknown'),
    };
    return typeLabels[type] || type.toUpperCase();
  };

  const renderFilters = () => (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="search-filter">{t('transaction_filter_search')}</label>
        <input
          id="search-filter"
          type="text"
          value={filters.search || ''}
          onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
          placeholder={t('transaction_filter_search_placeholder')}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="min-value-filter">{t('transaction_filter_min_value')}</label>
        <input
          id="min-value-filter"
          type="number"
          step="0.01"
          value={filters.minValue !== undefined ? filters.minValue : ''}
          onChange={(e) => handleFilterChange({ 
            minValue: e.target.value ? parseFloat(e.target.value) : undefined 
          })}
          placeholder={t('transaction_filter_min_value_placeholder')}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="max-value-filter">{t('transaction_filter_max_value')}</label>
        <input
          id="max-value-filter"
          type="number"
          step="0.01"
          value={filters.maxValue !== undefined ? filters.maxValue : ''}
          onChange={(e) => handleFilterChange({ 
            maxValue: e.target.value ? parseFloat(e.target.value) : undefined 
          })}
          placeholder={t('transaction_filter_max_value_placeholder')}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="min-date-filter">{t('transaction_filter_min_date')}</label>
        <input
          id="min-date-filter"
          type="date"
          value={filters.minDate || ''}
          onChange={(e) => handleFilterChange({ minDate: e.target.value || undefined })}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="max-date-filter">{t('transaction_filter_max_date')}</label>
        <input
          id="max-date-filter"
          type="date"
          value={filters.maxDate || ''}
          onChange={(e) => handleFilterChange({ maxDate: e.target.value || undefined })}
          className={styles.filterInput}
        />
      </div>
    </div>
  );

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t('transaction_error')}: {error}</p>
          <button onClick={() => loadTransactions(true)} className={styles.retryButton}>
            {t('transaction_retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4>📋 {t('transactions_for_account', { accountName })}</h4>
        <span className={styles.transactionCount}>
          {transactions.length} {t('transactions')}
        </span>
      </div>

      <div className={styles.filtersContainer}>
        {renderFilters()}
        <div className={styles.filterActions}>
          <button 
            onClick={handleResetFilters}
            className={styles.resetButton}
            title={t('transaction_filter_reset')}
          >
            🔄
          </button>
        </div>
      </div>

      {isLoading && transactions.length === 0 ? (
        <div className={styles.loading}>
          <p>{t('loading_transactions')}</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.transactionsTable}>
              <thead>
                <tr>
                  <th className={styles.colDate}>{t('transaction_date')}</th>
                  <th className={styles.colDescription}>{t('transaction_description')}</th>
                  <th className={styles.colType}>{t('transaction_type')}</th>
                  <th className={`${styles.colAmount} ${styles.textAlignRight}`}>
                    {t('transaction_amount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.id} className={styles.transactionRow}>
                    <td className={styles.colDate}>
                      <div className={styles.dateInfo}>
                        <div className={styles.mainDate}>{formatDate(transaction.date)}</div>
                        {transaction.datetime && (
                          <div className={styles.dateTime}>
                            {new Date(transaction.datetime).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={styles.colDescription}>
                      <div className={styles.description}>
                        <div className={styles.wording}>
                          {transaction.original_wording}
                        </div>
                      </div>
                    </td>
                    <td className={styles.colType}>
                      <span
                        className={styles.transactionType}
                        style={{ backgroundColor: getTransactionTypeColor(transaction.type) }}
                      >
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className={`${styles.colAmount} ${getBalanceClass(transaction.value)}`}>
                      {transaction.value !== null ? formatCurrency(transaction.value) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className={styles.loadMore}>
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className={styles.loadMoreButton}
              >
                {isLoading ? t('loading_more_transactions') : t('load_more_transactions')}
              </button>
            </div>
          )}

          {!hasMore && transactions.length > 0 && (
            <div className={styles.endMessage}>
              <p>{t('no_more_transactions')}</p>
            </div>
          )}

          {transactions.length === 0 && !isLoading && (
            <div className={styles.noTransactions}>
              <p>{t('no_transactions_found')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
