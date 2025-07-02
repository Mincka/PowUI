import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncManager } from '../../hooks/useSyncManager';
import { Connection, Account } from '../../types/accounts';
import { getBankNameFromAccount } from '../../utils/bankUtils';
import { ConnectorService } from '../../services/connectorService';
import { BankGroup } from './components/BankGroup';
import { BulkActions } from './components/BulkActions';
import { ConnectionWebviewSetup } from '../ConnectionWebviewSetup';
import styles from './ConnectionManager.module.css';

export interface ConnectorGroup {
  connectorUuid: string;
  connectorId: number;
  bankName: string;
  color: string;
  capabilities: string[];
  connections: ConnectionWithDetails[];
  totalAccounts: number;
  totalBalance: number;
  healthyConnections: number;
  duplicateConnections: number;
}

export interface ConnectionWithDetails extends Connection {
  accounts: Account[];
  bankName: string;
  isDuplicate: boolean;
  duplicateInfo?: {
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    duplicateWith: number[];
  };
  recommendedAction?: 'keep' | 'delete' | 'review';
  recommendationReason?: string;
}

type FilterMode = 'all' | 'duplicates' | 'errors' | 'recommendations';

interface ConnectionManagerProps {
  onAccountsRefresh?: () => void;
  onToggleNewConnectionSetup: () => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  onAccountsRefresh,
  onToggleNewConnectionSetup,
}) => {
  const { t } = useTranslation(['connections', 'forms']);
  const {
    syncStatus,
    connections,
    accounts,
    isLoadingConnections,
    isLoadingAccounts,
    duplicateConnections,
    connectorMap,
    syncConnection,
    syncAllConnections,
    deleteConnection,
    getConnectionStatusSummary,
    getConnectionBankInfo,
    getNextSyncTime,
    connectionNeedsAttention,
    clearSyncStatus,
  } = useSyncManager();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedConnections, setSelectedConnections] = useState<Set<number>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    connectionId: number;
    bankName: string;
    accountCount: number;
  } | null>(null);
  const [webviewModal, setWebviewModal] = useState<{
    connectionId: number;
    connectionBankName: string;
    mode: 'manage';
  } | null>(null);

  // Process and group connections by connector/bank
  const connectorGroups = useMemo((): ConnectorGroup[] => {
    if (!connections.length) return [];

    // Group accounts by connection for quick lookup
    const accountsByConnection = new Map<number, Account[]>();
    accounts.forEach(account => {
      if (account.id_connection) {
        if (!accountsByConnection.has(account.id_connection)) {
          accountsByConnection.set(account.id_connection, []);
        }
        accountsByConnection.get(account.id_connection)!.push(account);
      }
    });

    // Group connections by connector
    const groupMap = new Map<string, ConnectorGroup>();

    connections.forEach(connection => {
      const key = connection.connector_uuid;
      const connectionAccounts = accountsByConnection.get(connection.id) || [];

      // Get bank name and color
      const connectorInfo = ConnectorService.getConnectorInfo(
        connection.id_connector,
        connectorMap
      );
      let bankName = connectorInfo.name;

      // If connector service doesn't have the name, fall back to guessing from accounts
      if (bankName === `Connector ${connection.id_connector}` && connectionAccounts.length > 0) {
        bankName = getBankNameFromAccount(connectionAccounts[0], connections, connectorMap);
      }

      const color = ConnectorService.getConnectorColor(connection.id_connector, connectorMap);
      const capabilities = connectorInfo.capabilities || [];

      // Check for duplicates
      const duplicateInfo = duplicateConnections.find(
        dup => dup.connectionId === connection.id || dup.duplicateWith.includes(connection.id)
      );

      // Generate recommendations
      let recommendedAction: 'keep' | 'delete' | 'review' = 'keep';
      let recommendationReason = '';

      if (duplicateInfo) {
        const allDuplicateIds = [duplicateInfo.connectionId, ...duplicateInfo.duplicateWith];
        const duplicateConnectionsList = connections.filter(conn =>
          allDuplicateIds.includes(conn.id)
        );

        if (duplicateConnectionsList.length > 1) {
          const connectionAccountCount = connectionAccounts.length;
          const hasMoreAccountsThanOthers = duplicateConnectionsList.every(otherConn => {
            if (otherConn.id === connection.id) return true;
            const otherAccountCount = (accountsByConnection.get(otherConn.id) || []).length;
            return connectionAccountCount >= otherAccountCount;
          });

          const isNewest = duplicateConnectionsList.every(otherConn => {
            if (otherConn.id === connection.id) return true;
            const connLastUpdate = connection.last_update
              ? new Date(connection.last_update)
              : new Date(0);
            const otherLastUpdate = otherConn.last_update
              ? new Date(otherConn.last_update)
              : new Date(0);
            return connLastUpdate >= otherLastUpdate;
          });

          if (hasMoreAccountsThanOthers && isNewest) {
            recommendedAction = 'keep';
            recommendationReason = t('more_accounts_recent_data');
          } else if (connectionAccountCount === 0) {
            recommendedAction = 'delete';
            recommendationReason = t('no_associated_accounts');
          } else if (!hasMoreAccountsThanOthers) {
            recommendedAction = 'delete';
            recommendationReason = t('fewer_accounts');
          } else {
            recommendedAction = 'review';
            recommendationReason = t('manual_review_required');
          }
        }
      }

      const connectionWithDetails: ConnectionWithDetails = {
        ...connection,
        accounts: connectionAccounts,
        bankName,
        isDuplicate: !!duplicateInfo,
        duplicateInfo: duplicateInfo
          ? {
              reason: duplicateInfo.reason,
              confidence: duplicateInfo.confidence,
              duplicateWith: duplicateInfo.duplicateWith,
            }
          : undefined,
        recommendedAction,
        recommendationReason,
      };

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          connectorUuid: key,
          connectorId: connection.id_connector,
          bankName,
          color,
          capabilities,
          connections: [],
          totalAccounts: 0,
          totalBalance: 0,
          healthyConnections: 0,
          duplicateConnections: 0,
        });
      }

      groupMap.get(key)!.connections.push(connectionWithDetails);
    });

    // Calculate group statistics and sort connections
    const groups = Array.from(groupMap.values()).map(group => {
      // Sort connections within group
      group.connections.sort((a, b) => {
        const actionOrder = { keep: 0, review: 1, delete: 2 };
        const aOrder = actionOrder[a.recommendedAction || 'keep'];
        const bOrder = actionOrder[b.recommendedAction || 'keep'];

        if (aOrder !== bOrder) return aOrder - bOrder;

        if (a.accounts.length !== b.accounts.length) {
          return b.accounts.length - a.accounts.length;
        }

        const bLastUpdate = b.last_update ? new Date(b.last_update).getTime() : 0;
        const aLastUpdate = a.last_update ? new Date(a.last_update).getTime() : 0;
        return bLastUpdate - aLastUpdate;
      });

      // Calculate statistics
      group.totalAccounts = group.connections.reduce((sum, conn) => sum + conn.accounts.length, 0);
      group.totalBalance = group.connections.reduce(
        (sum, conn) => sum + conn.accounts.reduce((accSum, acc) => accSum + acc.balance, 0),
        0
      );
      group.healthyConnections = group.connections.filter(
        conn => conn.active && !conn.state && !conn.error
      ).length;
      group.duplicateConnections = group.connections.filter(conn => conn.isDuplicate).length;

      return group;
    });

    return groups.sort((a, b) => a.bankName.localeCompare(b.bankName));
  }, [connections, accounts, duplicateConnections, connectorMap, t]);

  // Filter groups based on current filter mode
  const filteredGroups = useMemo(() => {
    switch (filterMode) {
      case 'duplicates':
        return connectorGroups
          .map(group => ({
            ...group,
            connections: group.connections.filter(conn => conn.isDuplicate),
          }))
          .filter(group => group.connections.length > 0);

      case 'errors':
        return connectorGroups
          .map(group => ({
            ...group,
            connections: group.connections.filter(conn => conn.state || conn.error || !conn.active),
          }))
          .filter(group => group.connections.length > 0);

      case 'recommendations':
        return connectorGroups
          .map(group => ({
            ...group,
            connections: group.connections.filter(conn => conn.recommendedAction === 'delete'),
          }))
          .filter(group => group.connections.length > 0);

      default:
        return connectorGroups;
    }
  }, [connectorGroups, filterMode]);

  const handleSyncAll = async () => {
    try {
      await syncAllConnections();
      if (onAccountsRefresh) {
        onAccountsRefresh();
      }
    } catch (error) {
      console.error('Failed to sync all connections:', error);
    }
  };

  const handleSyncConnection = async (connectionId: number) => {
    try {
      await syncConnection(connectionId);
      if (onAccountsRefresh) {
        onAccountsRefresh();
      }
    } catch (error) {
      console.error(`Failed to sync connection ${connectionId}:`, error);
    }
  };

  const handleDeleteClick = (connectionId: number) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;

    const bankInfo = getConnectionBankInfo(connectionId);
    const bankName =
      bankInfo.bankNames.length > 0 ? bankInfo.bankNames.join(', ') : t('unknown_connection');

    setDeleteConfirmation({
      connectionId,
      bankName,
      accountCount: bankInfo.accountCount,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    try {
      await deleteConnection(deleteConfirmation.connectionId);
      setDeleteConfirmation(null);
      setSelectedConnections(prev => {
        const updated = new Set(prev);
        updated.delete(deleteConfirmation.connectionId);
        return updated;
      });
      if (onAccountsRefresh) {
        onAccountsRefresh();
      }
    } catch (error) {
      console.error(`Failed to delete connection ${deleteConfirmation.connectionId}:`, error);
    }
  };

  const handleToggleGroup = (connectorUuid: string) => {
    setExpandedGroups(prev => {
      const updated = new Set(prev);
      if (updated.has(connectorUuid)) {
        updated.delete(connectorUuid);
      } else {
        updated.add(connectorUuid);
      }
      return updated;
    });
  };

  const handleToggleConnection = (connectionId: number) => {
    setSelectedConnections(prev => {
      const updated = new Set(prev);
      if (updated.has(connectionId)) {
        updated.delete(connectionId);
      } else {
        updated.add(connectionId);
      }
      return updated;
    });
  };

  const handleManageConnection = (connectionId: number) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;

    const bankInfo = getConnectionBankInfo(connectionId);
    const bankName =
      bankInfo.bankNames.length > 0 ? bankInfo.bankNames.join(', ') : t('unknown_connection');

    setWebviewModal({
      connectionId,
      connectionBankName: bankName,
      mode: 'manage',
    });
  };

  const statusSummary = getConnectionStatusSummary();

  if (isLoadingConnections || isLoadingAccounts) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t('loading_connections')}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>{t('connection_manager')}</h2>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('total')}</span>
              <span className={styles.summaryValue}>{statusSummary.total}</span>
            </span>
            <span className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('active')}</span>
              <span className={`${styles.summaryValue} ${styles.active}`}>
                {statusSummary.healthy}
              </span>
            </span>
            {statusSummary.withErrors > 0 && (
              <span className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t('errors')}</span>
                <span className={`${styles.summaryValue} ${styles.error}`}>
                  {statusSummary.withErrors}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.filters}>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value as FilterMode)}
              className={styles.filterSelect}
            >
              <option value="all">{t('all_connections')}</option>
              <option value="duplicates">{t('duplicates')}</option>
              <option value="errors">{t('errors_filter')}</option>
              <option value="recommendations">{t('to_delete')}</option>
            </select>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={syncStatus.isLoading || statusSummary.active === 0}
            className={styles.syncAllButton}
            title={t('sync_all_active_connections')}
          >
            {syncStatus.isLoading ? '⟳' : '↻'}
            {t('global_sync')}
          </button>

          <button onClick={onToggleNewConnectionSetup} className={styles.newConnectionBtn}>
            {t('new_connection', { ns: 'forms' })}
          </button>
        </div>
      </div>

      {syncStatus.error && (
        <div className={styles.errorMessage}>
          <span>❌ {syncStatus.error}</span>
          <button onClick={clearSyncStatus} className={styles.clearButton}>
            ✕
          </button>
        </div>
      )}

      {selectedConnections.size > 0 && (
        <BulkActions
          selectedConnections={selectedConnections}
          connections={connections}
          onSync={handleSyncConnection}
          onDelete={handleDeleteClick}
          onClear={() => setSelectedConnections(new Set())}
          isLoading={syncStatus.isLoading}
        />
      )}

      <div className={styles.content}>
        {filteredGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('no_connections_found')}</p>
          </div>
        ) : (
          <div className={styles.groupsList}>
            {filteredGroups.map(group => (
              <BankGroup
                key={group.connectorUuid}
                group={group}
                isExpanded={expandedGroups.has(group.connectorUuid)}
                selectedConnections={selectedConnections}
                syncStatus={syncStatus}
                onToggleGroup={() => handleToggleGroup(group.connectorUuid)}
                onToggleConnection={handleToggleConnection}
                onSyncConnection={handleSyncConnection}
                onManageConnection={handleManageConnection}
                onDeleteConnection={handleDeleteClick}
                getNextSyncTime={getNextSyncTime}
                connectionNeedsAttention={connectionNeedsAttention}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{t('confirm_deletion')}</h3>
            </div>
            <div className={styles.modalBody}>
              <p>{t('deletion_warning')}</p>
              <ul>
                <li>
                  {t('connection_id', {
                    id: deleteConfirmation.connectionId,
                    bankName: deleteConfirmation.bankName,
                  })}
                </li>
                <li>
                  {deleteConfirmation.accountCount === 1
                    ? t('associated_accounts', { count: deleteConfirmation.accountCount })
                    : t('associated_accounts_plural', { count: deleteConfirmation.accountCount })}
                </li>
                <li>{t('historical_data')}</li>
                <li>{t('documents_identities')}</li>
              </ul>
              <p>{t('gdpr_notice')}</p>
              <p className={styles.warningText}>
                <strong>{t('confirm_continue')}</strong>
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setDeleteConfirmation(null)}
                className={styles.cancelButton}
                disabled={syncStatus.isLoading}
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.confirmDeleteButton}
                disabled={syncStatus.isLoading}
              >
                {syncStatus.isLoading ? t('deleting') : t('delete_permanently')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Webview Modal */}
      {webviewModal && (
        <ConnectionWebviewSetup
          connectionId={webviewModal.connectionId}
          connectionBankName={webviewModal.connectionBankName}
          mode={webviewModal.mode}
          onClose={() => setWebviewModal(null)}
        />
      )}
    </div>
  );
};
