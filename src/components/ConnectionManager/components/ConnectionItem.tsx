import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeLocalized, formatRelativeTime } from '../../../utils/dateUtils';
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
  onReauth?: () => void;
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
  onReauth,
  onDelete,
  getNextSyncTime,
  connectionNeedsAttention,
}) => {
  const { t, i18n } = useTranslation('connections');
  const lang = i18n.language.startsWith('fr') ? 'fr' : 'en';

  // Helper to format date/time for display
  const getDateTimeParts = (dateString: string | null) => {
    if (!dateString) return { date: t('never'), time: '' };
    const date = new Date(dateString);
    return formatDateTimeLocalized(date, lang);
  };

  const getRelative = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatRelativeTime(date, lang);
  };

  // Helper function to determine if connection needs re-authentication
  const needsReauth = () => {
    if (!connection.state && !connection.error) return false;
    const authErrors = [
      'SCARequired',
      'webauthRequired',
      'additionalInformationNeeded',
      'decoupled',
      'wrongpass',
    ];
    return (
      authErrors.includes(connection.state || '') || authErrors.includes(connection.error || '')
    );
  };

  const getConnectionStatusDisplay = () => {
    if (connection.state || connection.error) {
      const errorCode = connection.state || connection.error || 'unknown_error';
      const descriptionKey = `errors:${errorCode}_description`;

      // Try to get translated error description, fallback to original message or error code
      let detailedMessage;
      try {
        detailedMessage = t(descriptionKey);
        // If translation key doesn't exist, fall back to original message or error code
        if (detailedMessage === descriptionKey) {
          detailedMessage = connection.error_message || t(`errors:${errorCode}`) || errorCode;
          // If the main error key also doesn't exist, use error code
          if (detailedMessage === `errors:${errorCode}`) {
            detailedMessage = errorCode;
          }
        }
      } catch {
        detailedMessage = connection.error_message || errorCode;
      }

      // Show detailed message with error code in parentheses: "Message (ErrorCode)"
      const displayText = `${detailedMessage} (${errorCode})`;

      return {
        text: displayText,
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
              {needsReauth() && onReauth && (
                <button
                  onClick={onReauth}
                  className={styles.errorActionButton}
                  disabled={syncStatus.isLoading}
                >
                  {t(`errors:${connection.state || connection.error}_action`)}
                </button>
              )}
              <span className={styles.lastUpdate}>
                {(() => {
                  const { date, time } = getDateTimeParts(connection.last_update);
                  return t('last_update', { date, time });
                })()}
              </span>
              {nextSync && (
                <span className={styles.nextSync}>
                  {(() => {
                    const { time } = getDateTimeParts(nextSync);
                    const relative = getRelative(nextSync);
                    return t('next_update', { relative, time });
                  })()}
                </span>
              )}
              {connection.expire && (
                <span className={styles.lastUpdate}>
                  {(() => {
                    const { date, time } = getDateTimeParts(connection.expire);
                    const relative = getRelative(connection.expire);
                    return t('expiration', { relative, date, time });
                  })()}
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

          {needsReauth() && onReauth && (
            <button
              onClick={onReauth}
              disabled={syncStatus.isLoading}
              className={styles.reauthButton}
              title={t('reauth_connection_tooltip')}
            >
              🔐
            </button>
          )}

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
