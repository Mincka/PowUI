import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../types/accounts';
import { useAccountHistory } from '../../hooks/useAccountHistory';
import { AccountHistorySettings } from './AccountHistorySettings';
import { AccountHistoryViewer } from './AccountHistoryViewer';
import styles from './AccountHistory.module.css';

interface AccountHistoryProps {
  accounts: Account[];
}

type ActiveTab = 'viewer' | 'settings';

export const AccountHistory: React.FC<AccountHistoryProps> = ({ accounts }) => {
  const { t } = useTranslation('financial');
  const [activeTab, setActiveTab] = useState<ActiveTab>('viewer');
  
  const {
    isEnabled,
    toggleEnabled,
    userId,
  } = useAccountHistory();

  if (userId === 0) {
    return (
      <div className={styles.accountHistory}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('account_history')}</h2>
        </div>
        <div className={styles.noUserMessage}>
          <h3>{t('no_active_user')}</h3>
          <p>{t('account_history_requires_user')}</p>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className={styles.accountHistory}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('account_history')}</h2>
        </div>
        <div className={styles.disabledMessage}>
          <h3>{t('account_history_disabled')}</h3>
          <p>{t('account_history_disabled_description')}</p>
          <button
            className={styles.enableButton}
            onClick={() => toggleEnabled(true)}
          >
            {t('enable_account_history')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.accountHistory}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('account_history')}</h2>
        <button
          className={styles.toggleButton}
          onClick={() => toggleEnabled(false)}
        >
          {t('disable_history')}
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'viewer' ? styles.active : ''}`}
            onClick={() => setActiveTab('viewer')}
          >
            {t('view_history')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            {t('settings')}
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'viewer' && (
            <AccountHistoryViewer accounts={accounts} />
          )}
          {activeTab === 'settings' && (
            <AccountHistorySettings accounts={accounts} />
          )}
        </div>
      </div>
    </div>
  );
};
