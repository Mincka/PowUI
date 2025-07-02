import React from 'react';
import { useTranslation } from 'react-i18next';
import { SyncStatus } from '../../../types/accounts';
import { ConnectorGroup } from '../ConnectionManager';
import { ConnectionItem } from './ConnectionItem';
import styles from './BankGroup.module.css';

interface BankGroupProps {
  group: ConnectorGroup;
  isExpanded: boolean;
  selectedConnections: Set<number>;
  syncStatus: SyncStatus;
  onToggleGroup: () => void;
  onToggleConnection: (id: number) => void;
  onSyncConnection: (id: number) => void;
  onManageConnection: (id: number) => void;
  onDeleteConnection: (id: number) => void;
  getNextSyncTime: (id: number) => string | null;
  connectionNeedsAttention: (id: number) => boolean;
}

export const BankGroup: React.FC<BankGroupProps> = ({
  group,
  isExpanded,
  selectedConnections,
  syncStatus,
  onToggleGroup,
  onToggleConnection,
  onSyncConnection,
  onManageConnection,
  onDeleteConnection,
  getNextSyncTime,
  connectionNeedsAttention,
}) => {
  const { t } = useTranslation('dashboard');
  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const hasIssues = group.connections.some(
    conn => conn.state || conn.error || !conn.active || conn.isDuplicate
  );

  return (
    <div className={`${styles.bankGroup} ${hasIssues ? styles.hasIssues : ''}`}>
      <div className={styles.bankHeader} onClick={onToggleGroup}>
        <div className={styles.bankInfo}>
          <div className={styles.bankColorIndicator} style={{ backgroundColor: group.color }} />
          <div className={styles.bankDetails}>
            <h3 className={styles.bankName}>
              🏦 {group.bankName}{' '}
              <span className={styles.connectorId}>
                ({t('connector_id', { id: group.connectorId })})
              </span>
            </h3>
            {group.capabilities.length > 0 && (
              <div className={styles.capabilities}>{group.capabilities.join(', ')}</div>
            )}
            <div className={styles.bankStats}>
              <span className={styles.stat}>
                {group.connections.length} connexion{group.connections.length > 1 ? 's' : ''}
              </span>
              <span className={styles.stat}>
                {group.totalAccounts} compte{group.totalAccounts > 1 ? 's' : ''}
              </span>
              {group.totalBalance !== 0 && (
                <span className={styles.stat}>{formatBalance(group.totalBalance)}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.bankStatus}>
          <div className={styles.statusIndicators}>
            {group.healthyConnections > 0 && (
              <span className={`${styles.statusBadge} ${styles.healthy}`}>
                ✅ {group.healthyConnections}
              </span>
            )}
            {group.duplicateConnections > 0 && (
              <span className={`${styles.statusBadge} ${styles.duplicate}`}>
                ⚠️ {group.duplicateConnections}
              </span>
            )}
            {group.connections.length - group.healthyConnections > 0 && (
              <span className={`${styles.statusBadge} ${styles.error}`}>
                ❌ {group.connections.length - group.healthyConnections}
              </span>
            )}
          </div>

          <button className={styles.expandButton}>{isExpanded ? '▼' : '▶'}</button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.connectionsContainer}>
          {group.connections.map(connection => (
            <ConnectionItem
              key={connection.id}
              connection={connection}
              isSelected={selectedConnections.has(connection.id)}
              syncStatus={syncStatus}
              onToggleSelection={() => onToggleConnection(connection.id)}
              onSync={() => onSyncConnection(connection.id)}
              onManage={() => onManageConnection(connection.id)}
              onDelete={() => onDeleteConnection(connection.id)}
              getNextSyncTime={getNextSyncTime}
              connectionNeedsAttention={connectionNeedsAttention}
            />
          ))}
        </div>
      )}
    </div>
  );
};
