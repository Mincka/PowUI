import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, Connector } from '../../../types/accounts';
import { AccountHistoryEntry } from '../../../types/accountHistory';
import { organizeAccountsByBankWithConnectors } from '../../../utils/accountUtils';
import { ConnectorService } from '../../../services/connectorService';
import { AccountsService } from '../../../services/accountsService';
import { useAppData } from '../../../contexts/AppDataContext';
import styles from './HistoryTable.module.css';

interface HistoryTableProps {
  history: AccountHistoryEntry[];
  accounts: Account[];
}

interface TableRow {
  date: string;
  accountBalances: Record<number, number>;
  total: number;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history, accounts }) => {
  const { t } = useTranslation('financial');
  const { connections } = useAppData();
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());

  // Load connectors (similar to BankManager)
  useEffect(() => {
    const loadConnectors = async () => {
      if (accounts.length === 0 || connections.length === 0) return;

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
      }
    };

    loadConnectors();
    // Only re-run when visibility changes, not on every state update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length, connections.length]); // Use lengths to avoid infinite loop

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Group accounts by bank using proper connector logic
  const accountsByBank = useMemo(() => {
    return organizeAccountsByBankWithConnectors(accounts, connections, connectorMap);
  }, [accounts, connections, connectorMap]);

  // Create bank color mapping using actual connector colors
  const bankColorMap = useMemo(() => {
    const map: Record<string, string> = {};

    Object.entries(accountsByBank).forEach(([bankName, bankInfo]) => {
      if (bankInfo.accounts.length > 0) {
        const account = bankInfo.accounts[0];
        if (account.id_connection) {
          const connection = connections.find(conn => conn.id === account.id_connection);
          if (connection?.id_connector) {
            const connectorInfo = ConnectorService.getConnectorInfo(
              connection.id_connector,
              connectorMap
            );
            if (connectorInfo.color) {
              // Convert to light background color
              map[bankName] = hexToRgba(connectorInfo.color, 0.1);
            }
          }
        }
      }

      // Fallback if no color found
      if (!map[bankName]) {
        const hue = (bankName.length * 37) % 360;
        map[bankName] = `hsla(${hue}, 65%, 50%, 0.1)`;
      }
    });

    return map;
  }, [accountsByBank, connections, connectorMap]);

  const tableData = useMemo(() => {
    // Group history by date
    const groupedByDate = history.reduce(
      (acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = {};
        }
        acc[entry.date][entry.accountId] = entry.balance;
        return acc;
      },
      {} as Record<string, Record<number, number>>
    );

    // Convert to table rows
    const rows: TableRow[] = Object.entries(groupedByDate)
      .map(([date, accountBalances]) => {
        const total = Object.values(accountBalances).reduce((sum, balance) => sum + balance, 0);
        return {
          date,
          accountBalances,
          total,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending

    return rows;
  }, [history]);

  const formatCurrency = (amount: number, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (tableData.length === 0) {
    return (
      <div className={styles.noData}>
        <p>{t('no_data_for_period')}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            {/* Bank header row */}
            <tr>
              <th className={styles.dateHeader}>{t('date')}</th>
              {Object.entries(accountsByBank).map(([bankName, bankInfo]) => (
                <th key={bankName} className={styles.bankHeader} colSpan={bankInfo.accounts.length}>
                  {bankName}
                </th>
              ))}
              <th className={styles.totalHeader}>{t('total')}</th>
            </tr>
            {/* Account header row */}
            <tr>
              <th className={styles.dateHeader}></th>
              {Object.entries(accountsByBank).flatMap(([bankName, bankInfo]) =>
                bankInfo.accounts.map(account => (
                  <th
                    key={account.id}
                    className={styles.accountHeader}
                    style={{ backgroundColor: bankColorMap[bankName] }}
                  >
                    <div className={styles.accountHeaderContent}>
                      <div className={styles.accountName}>{account.name}</div>
                      <div className={styles.accountType}>{account.type}</div>
                    </div>
                  </th>
                ))
              )}
              <th className={styles.totalHeader}></th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.date} className={styles.dataRow}>
                <td className={styles.dateCell}>{formatDate(row.date)}</td>
                {Object.entries(accountsByBank).flatMap(([bankName, bankInfo]) =>
                  bankInfo.accounts.map(account => {
                    const balance = row.accountBalances[account.id];
                    return (
                      <td
                        key={account.id}
                        className={styles.balanceCell}
                        style={{ backgroundColor: bankColorMap[bankName] }}
                      >
                        {balance !== undefined ? (
                          <span
                            className={
                              balance >= 0 ? styles.positiveBalance : styles.negativeBalance
                            }
                          >
                            {formatCurrency(balance, 'EUR')}
                          </span>
                        ) : (
                          <span className={styles.noData}>-</span>
                        )}
                      </td>
                    );
                  })
                )}
                <td className={styles.totalCell}>
                  <span
                    className={row.total >= 0 ? styles.positiveBalance : styles.negativeBalance}
                  >
                    {formatCurrency(row.total)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
