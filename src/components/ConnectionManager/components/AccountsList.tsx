import React from 'react';
import { Account } from '../../../types/accounts';
import styles from './AccountsList.module.css';

interface AccountsListProps {
  accounts: Account[];
}

export const AccountsList: React.FC<AccountsListProps> = ({ accounts }) => {
  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'checking':
      case 'current':
        return '💳';
      case 'savings':
        return '💰';
      case 'investment':
      case 'securities':
        return '📈';
      case 'loan':
      case 'credit':
        return '🏦';
      case 'insurance':
        return '🛡️';
      default:
        return '💼';
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'checking':
      case 'current':
        return 'Compte Courant';
      case 'savings':
        return 'Épargne';
      case 'investment':
      case 'securities':
        return 'Investissement';
      case 'loan':
      case 'credit':
        return 'Crédit';
      case 'insurance':
        return 'Assurance';
      default:
        return type || 'Compte';
    }
  };

  if (accounts.length === 0) {
    return (
      <div className={styles.accountsList}>
        <div className={styles.noAccounts}>Aucun compte associé</div>
      </div>
    );
  }

  return (
    <div className={styles.accountsList}>
      <div className={styles.accountsHeader}>
        <span className={styles.accountsCount}>
          {accounts.length} compte{accounts.length > 1 ? 's' : ''}
        </span>
        <span className={styles.totalBalance}>
          Total: {formatBalance(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
        </span>
      </div>

      <div className={styles.accounts}>
        {accounts.map(account => (
          <div key={account.id} className={styles.accountItem}>
            <div className={styles.accountInfo}>
              <span className={styles.accountIcon}>{getAccountTypeIcon(account.type)}</span>

              <div className={styles.accountDetails}>
                <div className={styles.accountName}>{account.name || `Compte ${account.id}`}</div>
                <div className={styles.accountMeta}>
                  <span className={styles.accountId}>ID: {account.id}</span>
                </div>
                <div className={styles.accountMeta}>
                  <span className={styles.accountType}>{getAccountTypeName(account.type)}</span>
                  {account.number && <span className={styles.accountNumber}>{account.number}</span>}
                  {account.iban && (
                    <span className={styles.accountIban} title={account.iban}>
                      IBAN: {account.iban}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.accountBalance}>
              <span
                className={`${styles.balance} ${account.balance >= 0 ? styles.positive : styles.negative}`}
              >
                {formatBalance(account.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
