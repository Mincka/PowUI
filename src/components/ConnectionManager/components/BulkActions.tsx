import React from 'react';
import { Connection } from '../../../types/accounts';
import styles from './BulkActions.module.css';

interface BulkActionsProps {
  selectedConnections: Set<number>;
  connections: Connection[];
  onSync: (id: number) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  isLoading: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedConnections,
  connections,
  onSync,
  onDelete,
  onClear,
  isLoading,
}) => {
  const selectedConnectionsList = connections.filter(conn => selectedConnections.has(conn.id));

  const activeConnections = selectedConnectionsList.filter(conn => conn.active);
  const inactiveConnections = selectedConnectionsList.filter(conn => !conn.active);

  const handleSyncSelected = async () => {
    for (const connection of activeConnections) {
      try {
        await onSync(connection.id);
      } catch (error) {
        console.error(`Failed to sync connection ${connection.id}:`, error);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${selectedConnections.size} connexion(s) sélectionnée(s) ?\n\n` +
          `Cette action est irréversible et supprimera définitivement :\n` +
          `- Les connexions sélectionnées\n` +
          `- Tous les comptes associés\n` +
          `- Toutes les transactions et données historiques\n` +
          `- Tous les documents et identités liés`
      )
    ) {
      selectedConnectionsList.forEach(connection => {
        onDelete(connection.id);
      });
    }
  };

  return (
    <div className={styles.bulkActions}>
      <div className={styles.selectionInfo}>
        <span className={styles.selectionCount}>
          {selectedConnections.size} connexion{selectedConnections.size > 1 ? 's' : ''} sélectionnée
          {selectedConnections.size > 1 ? 's' : ''}
        </span>

        {activeConnections.length > 0 && (
          <span className={styles.activeCount}>
            ({activeConnections.length} active{activeConnections.length > 1 ? 's' : ''})
          </span>
        )}

        {inactiveConnections.length > 0 && (
          <span className={styles.inactiveCount}>
            ({inactiveConnections.length} inactive{inactiveConnections.length > 1 ? 's' : ''})
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSyncSelected}
          disabled={isLoading || activeConnections.length === 0}
          className={styles.syncButton}
          title={`Synchroniser ${activeConnections.length} connexion(s) active(s)`}
        >
          {isLoading ? '⟳' : '↻'}
          Sync Sélection ({activeConnections.length})
        </button>

        <button
          onClick={handleDeleteSelected}
          disabled={isLoading}
          className={styles.deleteButton}
          title="Supprimer toutes les connexions sélectionnées (action irréversible)"
        >
          🗑️ Supprimer ({selectedConnections.size})
        </button>

        <button
          onClick={onClear}
          disabled={isLoading}
          className={styles.clearButton}
          title="Désélectionner toutes les connexions"
        >
          ✕ Désélectionner
        </button>
      </div>
    </div>
  );
};
