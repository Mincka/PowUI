import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, Connector } from '../../types/accounts';
import { useAccountHistory } from '../../hooks/useAccountHistory';
import { organizeAccountsByBankWithConnectors } from '../../utils/accountUtils';
import { ConnectorService } from '../../services/connectorService';
import { AccountsService } from '../../services/accountsService';
import { useAppData } from '../../contexts/AppDataContext';
import styles from './AccountHistorySettings.module.css';

interface AccountHistorySettingsProps {
  accounts: Account[];
}

export const AccountHistorySettings: React.FC<AccountHistorySettingsProps> = ({ accounts }) => {
  const { t } = useTranslation('financial');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const { connections } = useAppData();
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());
  
  const {
    selectedAccounts,
    updateSelectedAccounts,
    clearUserHistory,
    getEligibleAccounts,
  } = useAccountHistory();

  const eligibleAccounts = getEligibleAccounts(accounts);

  // Load connectors (similar to BankManager)
  useEffect(() => {
    const loadConnectors = async () => {
      if (eligibleAccounts.length === 0 || connections.length === 0) return;

      try {
        const config = AccountsService.getConfig();

        // Get unique connection IDs from accounts
        const connectionIds = [...new Set(eligibleAccounts.map(acc => acc.id_connection).filter(Boolean))];
        if (connectionIds.length === 0) {
          return;
        }

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
  }, [eligibleAccounts.length, connections.length]); // Use lengths to avoid infinite loop

  // Group accounts by bank using proper connector logic
  const accountsByBank = useMemo(() => {
    const bankInfo = organizeAccountsByBankWithConnectors(eligibleAccounts, connections, connectorMap);
    
    // Convert to simple bank->accounts mapping and sort
    const result: Record<string, Account[]> = {};
    Object.entries(bankInfo)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort banks alphabetically
      .forEach(([bankName, info]) => {
        // Sort accounts within bank by balance (descending)
        result[bankName] = info.accounts.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
      });
    
    return result;
  }, [eligibleAccounts, connections, connectorMap]);

  const handleAccountToggle = (accountId: number) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];
    
    updateSelectedAccounts(newSelection);
  };

  const handleSelectAll = () => {
    const allEligibleIds = eligibleAccounts.map(account => account.id);
    updateSelectedAccounts(allEligibleIds);
  };

  const handleDeselectAll = () => {
    updateSelectedAccounts([]);
  };

  const handleClearHistory = () => {
    clearUserHistory();
    setShowConfirmClear(false);
  };

  if (eligibleAccounts.length === 0) {
    return (
      <div className={styles.settings}>
        <div className={styles.noAccountsMessage}>
          <h3>{t('no_eligible_accounts')}</h3>
          <p>{t('no_eligible_accounts_description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settings}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('account_selection')}</h3>
        <p className={styles.sectionDescription}>
          {t('account_selection_description')}
        </p>
        
        <div className={styles.selectionControls}>
          <button
            className={styles.controlButton}
            onClick={handleSelectAll}
            disabled={selectedAccounts.length === eligibleAccounts.length}
          >
            {t('select_all')}
          </button>
          <button
            className={styles.controlButton}
            onClick={handleDeselectAll}
            disabled={selectedAccounts.length === 0}
          >
            {t('deselect_all')}
          </button>
        </div>

        <div className={styles.accountList}>
          {Object.entries(accountsByBank).map(([bankName, bankAccounts]) => (
            <div key={bankName} className={styles.bankGroup}>
              <div className={styles.bankHeader}>{bankName}</div>
              {bankAccounts.map(account => (
                <label key={account.id} className={styles.accountItem}>
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={() => handleAccountToggle(account.id)}
                    className={styles.checkbox}
                  />
                  <div className={styles.accountInfo}>
                    <div className={styles.accountName}>{account.name}</div>
                    <div className={styles.accountDetails}>
                      <span className={styles.accountType}>{account.type}</span>
                      <span className={styles.accountBalance}>
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(account.balance)}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.selectionSummary}>
          {t('accounts_selected', { 
            selected: selectedAccounts.length, 
            total: eligibleAccounts.length 
          })}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('data_management')}</h3>
        <p className={styles.sectionDescription}>
          {t('data_management_description')}
        </p>

        {!showConfirmClear ? (
          <button
            className={styles.clearButton}
            onClick={() => setShowConfirmClear(true)}
          >
            {t('clear_all_history')}
          </button>
        ) : (
          <div className={styles.confirmationBox}>
            <p className={styles.confirmationText}>
              {t('clear_history_confirmation')}
            </p>
            <div className={styles.confirmationButtons}>
              <button
                className={styles.confirmButton}
                onClick={handleClearHistory}
              >
                {t('yes_clear')}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setShowConfirmClear(false)}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
