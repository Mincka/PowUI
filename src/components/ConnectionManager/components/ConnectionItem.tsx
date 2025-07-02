import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SyncStatus } from '../../../types/accounts';
import { ConnectionWithDetails } from '../ConnectionManager';
import { AccountsList } from './AccountsList';
import styles from './ConnectionItem.module.css';

interface ConnectionItemProps {
  connection: ConnectionWithDetails;
  isSelected: boolean;
  syncStatus: SyncStatus;
  onToggleSelection: () => void;
  onSync: () => void;
  onManage?: () => void;
  onDelete: () => void;
  getNextSyncTime: (connectionId: number) => string | null;
  connectionNeedsAttention: (connectionId: number) => boolean;
}

export const ConnectionItem: React.FC<ConnectionItemProps> = ({
  connection,
  isSelected,
  syncStatus,
  onToggleSelection,
  onSync,
  onManage,
  onDelete,
  getNextSyncTime,
  connectionNeedsAttention,
}) => {
  const { t } = useTranslation('connections');
  const formatDateTime = useMemo(
    () => (dateString: string | null) => {
      if (!dateString) return t('never');
      return new Date(dateString).toLocaleDateString();
    },
    [t]
  );

  const formatDateTimeShort = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 0) {
      return t('exceeded');
    } else if (diffMins < 60) {
      return `${diffMins}min`;
    } else if (diffMins < 24 * 60) {
      const hours = Math.round(diffMins / 60);
      return `${hours}h`;
    } else {
      const days = Math.round(diffMins / (24 * 60));
      return `${days}j`;
    }
  };

  const getConnectionStatusDisplay = () => {
    if (connection.state || connection.error) {
      return {
        text: connection.error_message || connection.state || connection.error || t('error'),
        class: styles.statusError,
      };
    }
    if (!connection.active) {
      return {
        text: t('inactive'),
        class: styles.statusInactive,
      };
    }
    return {
      text: t('active'),
      class: styles.statusActive,
    };
  };

  const nextSync = getNextSyncTime(connection.id);
  const isCurrentlySyncing = syncStatus.isLoading && syncStatus.connectionId === connection.id;
  const isCurrentlyDeleting = syncStatus.isLoading && syncStatus.connectionId === connection.id;
  const needsAttention = connectionNeedsAttention(connection.id);
  const status = getConnectionStatusDisplay();

  let itemClassName = styles.connectionItem;
  if (needsAttention) {
    itemClassName += ` ${styles.needsAttention}`;
  }
  if (connection.isDuplicate) {
    itemClassName += ` ${styles.duplicateConnection}`;
  }
  if (isSelected) {
    itemClassName += ` ${styles.selected}`;
  }

  return (
    <div className={itemClassName}>
      <div className={styles.connectionHeader}>
        <div className={styles.connectionInfo}>
          <div className={styles.connectionIdentity}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className={styles.checkbox}
            />

            <div className={styles.connectionId}>
              <span className={styles.idNumber}>
                {t('connection_number', { id: connection.id })}
              </span>
              <div className={styles.uuid} title={connection.connector_uuid}>
                {connection.connector_uuid}
              </div>
            </div>

            {connection.isDuplicate && connection.duplicateInfo && (
              <span
                className={`${styles.duplicateIndicator} ${styles[connection.duplicateInfo.confidence]}`}
                title={t('duplicate_indicator_tooltip', {
                  reason: connection.duplicateInfo.reason,
                })}
              >
                ⚠️
              </span>
            )}
          </div>

          <div className={styles.connectionMeta}>
            <div className={styles.statusInfo}>
              <span className={status.class}>{status.text}</span>
              <span className={styles.lastUpdate}>
                {t('update_label')} {formatDateTime(connection.last_update)}
              </span>
              {nextSync && (
                <span className={styles.nextSync}>
                  {t('next_sync_label')} {formatDateTimeShort(nextSync)}
                </span>
              )}
            </div>

            {connection.recommendedAction && connection.recommendedAction !== 'keep' && (
              <div className={styles.recommendation}>
                <span
                  className={`${styles.badge} ${styles[`badge${connection.recommendedAction.charAt(0).toUpperCase() + connection.recommendedAction.slice(1)}`]}`}
                >
                  {connection.recommendedAction === 'delete'
                    ? t('delete_action')
                    : t('review_action')}
                </span>
                {connection.recommendationReason && (
                  <span className={styles.recommendationReason}>
                    {connection.recommendationReason}
                  </span>
                )}
              </div>
            )}

            {connection.isDuplicate && connection.duplicateInfo && (
              <div className={styles.duplicateInfo}>
                <small className={styles.duplicateReason}>{connection.duplicateInfo.reason}</small>
              </div>
            )}
          </div>
        </div>

        <div className={styles.connectionActions}>
          <button
            onClick={onSync}
            disabled={
              !connection.active ||
              isCurrentlySyncing ||
              (syncStatus.isLoading && syncStatus.connectionId !== connection.id)
            }
            className={styles.syncButton}
            title={connection.active ? t('sync_connection') : t('connection_inactive')}
          >
            {isCurrentlySyncing ? '⟳' : '↻'}
          </button>

          <button
            onClick={() => onManage && onManage()}
            disabled={syncStatus.isLoading}
            className={styles.manageButton}
            title={t('manage_connection_tooltip')}
          >
            ⚙️
          </button>

          <button
            onClick={onDelete}
            disabled={
              isCurrentlyDeleting ||
              (syncStatus.isLoading && syncStatus.connectionId !== connection.id)
            }
            className={styles.deleteButton}
            title={t('delete_connection_tooltip')}
          >
            🗑️
          </button>
        </div>
      </div>

      {connection.accounts.length > 0 && <AccountsList accounts={connection.accounts} />}
    </div>
  );
};
