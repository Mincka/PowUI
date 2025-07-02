import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, Connector } from '../../types/accounts';
import {
  organizeAccountsByBankWithConnectors,
  formatCurrency,
  getAccountTypeDisplayName,
  getAccountTypeColor,
} from '../../utils/accountUtils';
import { ConnectorService } from '../../services/connectorService';
import { AccountsService } from '../../services/accountsService';
import { useAppData } from '../../contexts/AppDataContext';
import { Transactions } from '../Transactions';
import styles from './BankManager.module.css';

interface BankManagerProps {
  accounts: Account[];
}

export const BankManager: React.FC<BankManagerProps> = ({ accounts }) => {
  const { t } = useTranslation('dashboard');
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [collapsedBanks, setCollapsedBanks] = useState<Record<string, boolean>>(() => {
    const storedState = localStorage.getItem('bankManagerCollapsedState');
    if (storedState) {
      return JSON.parse(storedState);
    }
    return {};
  });
  const [visibleTransactions, setVisibleTransactions] = useState<Record<number, boolean>>(() => {
    const storedState = localStorage.getItem('bankManagerTransactionsState');
    if (storedState) {
      return JSON.parse(storedState);
    }
    return {};
  });

  const { connections } = useAppData();

  const uniqueAccounts = useMemo(() => {
    const seen = new Set<number>();
    return accounts.filter(account => {
      if (seen.has(account.id)) {
        return false;
      }
      seen.add(account.id);
      return true;
    });
  }, [accounts]);

  const accountsByBank = useMemo(
    () => organizeAccountsByBankWithConnectors(uniqueAccounts, connections, connectorMap),
    [uniqueAccounts, connections, connectorMap]
  );

  // Ensure collapsedBanks always has an entry for each bank in accountsByBank
  useEffect(() => {
    if (Object.keys(accountsByBank).length === 0) {
      return;
    }
    setCollapsedBanks(prev => {
      let changed = false;
      const updated = { ...prev };
      for (const bankName of Object.keys(accountsByBank)) {
        if (!(bankName in updated)) {
          updated[bankName] = true; // Default to collapsed
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [accountsByBank]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bankManagerCollapsedState', JSON.stringify(collapsedBanks));
  }, [collapsedBanks]);

  useEffect(() => {
    localStorage.setItem('bankManagerTransactionsState', JSON.stringify(visibleTransactions));
  }, [visibleTransactions]);

  useEffect(() => {
    const loadConnectors = async () => {
      if (accounts.length === 0 || connections.length === 0) return;

      setIsLoadingConnectors(true);
      try {
        const config = AccountsService.getConfig();

        // Get unique connection IDs from accounts
        const connectionIds = [...new Set(accounts.map(acc => acc.id_connection).filter(Boolean))];
        if (connectionIds.length === 0) return;

        // Get connector IDs from connections
        const connectorIds = [
          ...new Set(
            connections
              .filter(conn => connectionIds.includes(conn.id))
              .map(conn => conn.id_connector)
              .filter(Boolean)
          ),
        ];

        if (connectorIds.length > 0) {
          // Load connectors using the actual connector IDs
          const connectors = await ConnectorService.getConnectorsWithCache(connectorIds, config);
          setConnectorMap(connectors);
        }
      } catch (error) {
        console.error('Failed to load connectors:', error);
      } finally {
        setIsLoadingConnectors(false);
      }
    };

    loadConnectors();
  }, [accounts, connections]);

  const toggleBankCollapse = (bankName: string) => {
    setCollapsedBanks(prevState => ({
      ...prevState,
      [bankName]: !prevState[bankName],
    }));
  };

  const toggleTransactions = (accountId: number) => {
    setVisibleTransactions(prevState => ({
      ...prevState,
      [accountId]: !prevState[accountId],
    }));
  };

  const expandAll = () => {
    const allExpanded = Object.keys(accountsByBank).reduce(
      (acc, bankName) => {
        acc[bankName] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setCollapsedBanks(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed = Object.keys(accountsByBank).reduce(
      (acc, bankName) => {
        acc[bankName] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setCollapsedBanks(allCollapsed);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return styles.balancePositive;
    if (balance < 0) return styles.balanceNegative;
    return styles.balanceZero;
  };

  const formatDateTime = useMemo(
    () => (dateString: string) => {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    []
  );

  const getConnectorInfo = (account: Account) => {
    if (!account.id_connection) return null;

    // Find the connection for this account
    const connection = connections.find(conn => conn.id === account.id_connection);
    if (!connection || !connection.id_connector) return null;

    // Get connector info using the connector ID from the connection
    return ConnectorService.getConnectorInfo(connection.id_connector, connectorMap);
  };

  // Only render bank view when connectorMap is loaded for all relevant connectors
  const allConnectorsLoaded = useMemo(() => {
    if (accounts.length === 0) return true;
    const neededConnectorIds = [
      ...new Set(
        accounts
          .map(acc => acc.id_connection)
          .filter(Boolean)
          .map(idConn => {
            const conn = connections.find(c => c.id === idConn);
            return conn?.id_connector;
          })
          .filter((id): id is number => typeof id === 'number')
      ),
    ];
    return neededConnectorIds.every(id => connectorMap.has(id));
  }, [accounts, connections, connectorMap]);

  const renderBankView = () => {
    if (!allConnectorsLoaded) {
      return <div className={styles.bankView} />;
    }
    return (
      <div className={styles.bankView}>
        {Object.entries(accountsByBank)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([bankName, bankInfo]) => {
            const connectorInfo =
              bankInfo.accounts.length > 0 ? getConnectorInfo(bankInfo.accounts[0]) : null;
            const isCollapsed = collapsedBanks[bankName] ?? true;

            return (
              <div key={bankName} className={styles.bankSection}>
                <div
                  className={styles.bankHeader}
                  style={{
                    backgroundColor: connectorInfo?.color,
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleBankCollapse(bankName)}
                >
                  <div className={styles.bankHeaderLeft}>
                    <span className={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                    <h3>🏦 {bankName}</h3>
                    {connectorInfo && connectorInfo.connector && (
                      <div className={styles.connectorInfo}>
                        {connectorInfo.beta && <span className={styles.betaBadge}>BETA</span>}
                      </div>
                    )}
                  </div>
                  <div className={styles.bankHeaderInfo}>
                    <span className={styles.accountCount}>
                      {bankInfo.accounts.length === 1
                        ? t('one_account')
                        : t('multiple_accounts', { count: bankInfo.accounts.length })}
                    </span>
                    <span
                      className={`${styles.balanceBadge} ${getBalanceClass(bankInfo.totalBalance)}`}
                    >
                      {formatCurrency(bankInfo.totalBalance)}
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className={styles.bankAccounts}>
                    <table className={styles.accountsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colAccount}>{t('account')}</th>
                          <th className={styles.colType}>{t('type')}</th>
                          <th className={`${styles.colBalance} ${styles.textAlignRight}`}>
                            {t('balance')}
                          </th>
                          <th className={`${styles.colComingBalance} ${styles.textAlignRight}`}>
                            {t('coming_balance')}
                          </th>
                          <th className={`${styles.colLastUpdate} ${styles.textAlignRight}`}>
                            {t('last_update')}
                          </th>
                          <th className={styles.colActions}>{t('transactions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankInfo.accounts.map(account => {
                          const showTransactions = visibleTransactions[account.id] ?? false;
                          return (
                            <React.Fragment key={account.id}>
                              <tr>
                                <td className={styles.colAccount}>
                                  <div className={styles.accountName}>{account.name}</div>
                                  <div className={styles.accountNumber}>{account.number}</div>
                                </td>
                                <td className={styles.colType}>
                                  <span
                                    className={styles.accountType}
                                    style={{ backgroundColor: getAccountTypeColor(account.type) }}
                                  >
                                    {getAccountTypeDisplayName(account.type)}
                                  </span>
                                </td>
                                <td
                                  className={`${styles.colBalance} ${getBalanceClass(account.balance)}`}
                                >
                                  {account.balance !== 0 ? formatCurrency(account.balance) : '-'}
                                </td>
                                <td
                                  className={`${styles.colComingBalance} ${getBalanceClass(account.coming_balance)}`}
                                >
                                  {account.coming !== null && account.coming_balance !== 0
                                    ? formatCurrency(account.coming_balance)
                                    : '-'}
                                </td>
                                <td className={`${styles.colLastUpdate} ${styles.lastUpdate}`}>
                                  {formatDateTime(account.last_update)}
                                </td>
                                <td className={styles.colActions}>
                                  <button
                                    onClick={() => toggleTransactions(account.id)}
                                    className={styles.transactionToggle}
                                    title={showTransactions ? t('hide_transactions') : t('show_transactions')}
                                  >
                                    📋 {showTransactions ? '▼' : '▶'}
                                  </button>
                                </td>
                              </tr>
                              {showTransactions && (
                                <tr>
                                  <td colSpan={6} className={styles.transactionCell}>
                                    <Transactions
                                      accountId={account.id}
                                      accountName={account.name}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{t('bank_organization')}</h3>
        <div className={styles.controls}>
          <button onClick={expandAll} className={styles.controlButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
            <span>{t('expand_all')}</span>
          </button>
          <button onClick={collapseAll} className={styles.controlButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 11 12 6 7 11"></polyline>
              <polyline points="17 18 12 13 7 18"></polyline>
            </svg>
            <span>{t('collapse_all')}</span>
          </button>
        </div>
        <p>{isLoadingConnectors && t('loading_connector_info')}</p>
      </div>

      {renderBankView()}

      {isLoadingConnectors && (
        <div className={styles.loading}>
          <p>{t('loading_connector_info_detailed')}</p>
        </div>
      )}
    </div>
  );
};
