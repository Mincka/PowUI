import { useState, useCallback, useMemo, useEffect } from 'react';
import { Connection, SyncStatus, Account, Connector } from '../types/accounts';
import { AccountsService } from '../services/accountsService';
import { getBankNameFromAccount } from '../utils/bankUtils';
import {
  detectDuplicateConnections,
  DuplicateInfo,
  isConnectionDuplicate,
  getConnectionDuplicateInfo,
} from '../utils/connectionDeduplication';
import { ConnectorService } from '../services/connectorService';
import { useAppData } from '../contexts/AppDataContext';

export interface ConnectionWithBankInfo extends Connection {
  bankNames: string[];
  accountCount: number;
  totalBalance: number;
  accounts: Account[];
}

export const useSyncManager = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    connectionId: null,
    lastSync: null,
    error: null,
  });

  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);

  // Use centralized data instead of local state
  const {
    connections,
    accounts,
    isLoadingConnections,
    isLoadingAccounts,
    updateConnection,
    removeConnection,
    refetch,
  } = useAppData();

  // Load connectors when connections change
  useEffect(() => {
    const loadConnectors = async () => {
      if (connections.length === 0) return;

      const neededConnectorIds = [...new Set(connections.map(conn => conn.id_connector))];
      if (neededConnectorIds.length === 0) return;

      setIsLoadingConnectors(true);
      try {
        const config = AccountsService.getConfig();
        const connectors = await ConnectorService.getConnectorsWithCache(
          neededConnectorIds,
          config
        );
        setConnectorMap(connectors);
      } catch (error) {
        console.error('Failed to load connectors:', error);
        // Continue with empty connector map - will fall back to guessing
      } finally {
        setIsLoadingConnectors(false);
      }
    };

    loadConnectors();
  }, [connections]);

  /**
   * Fetch both connections and accounts (now delegates to centralized data)
   */
  const fetchConnectionsAndAccounts = useCallback(async () => {
    await refetch();
  }, [refetch]);

  /**
   * Sync a specific connection
   */
  const syncConnection = useCallback(
    async (connectionId: number) => {
      setSyncStatus({
        isLoading: true,
        connectionId,
        lastSync: null,
        error: null,
      });

      try {
        const updatedConnection = await AccountsService.syncConnection(connectionId);

        // Update the connection in the centralized state
        updateConnection(updatedConnection);

        setSyncStatus({
          isLoading: false,
          connectionId,
          lastSync: updatedConnection.last_update,
          error: null,
        });

        return updatedConnection;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sync connection';
        setSyncStatus({
          isLoading: false,
          connectionId,
          lastSync: null,
          error: errorMessage,
        });
        throw error;
      }
    },
    [updateConnection]
  );

  /**
   * Sync all active connections
   */
  const syncAllConnections = useCallback(async () => {
    setSyncStatus({
      isLoading: true,
      connectionId: null,
      lastSync: null,
      error: null,
    });

    try {
      const updatedConnections = await AccountsService.syncAllConnections();

      // Update all connections in the centralized state
      updatedConnections.forEach(connection => {
        updateConnection(connection);
      });

      setSyncStatus({
        isLoading: false,
        connectionId: null,
        lastSync: new Date().toISOString(),
        error: null,
      });

      return updatedConnections;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync connections';
      setSyncStatus({
        isLoading: false,
        connectionId: null,
        lastSync: null,
        error: errorMessage,
      });
      throw error;
    }
  }, [updateConnection]);

  /**
   * Get connection by ID
   */
  const getConnection = useCallback(
    (connectionId: number): Connection | undefined => {
      return connections.find(conn => conn.id === connectionId);
    },
    [connections]
  );

  /**
   * Get connections mapped by ID for quick lookup
   */
  const getConnectionsMap = useCallback((): Map<number, Connection> => {
    return new Map(connections.map(conn => [conn.id, conn]));
  }, [connections]);

  /**
   * Get next sync time for a connection
   */
  const getNextSyncTime = useCallback(
    (connectionId: number): string | null => {
      const connection = getConnection(connectionId);
      return connection?.next_try || null;
    },
    [getConnection]
  );

  /**
   * Check if a connection needs attention (has errors)
   */
  const connectionNeedsAttention = useCallback(
    (connectionId: number): boolean => {
      const connection = getConnection(connectionId);
      return !!(connection?.state || connection?.error);
    },
    [getConnection]
  );

  /**
   * Get connection status summary
   */
  const getConnectionStatusSummary = useCallback(() => {
    const active = connections.filter(conn => conn.active).length;
    const total = connections.length;
    const withErrors = connections.filter(conn => conn.state || conn.error).length;
    const inactive = connections.filter(conn => !conn.active).length;

    return {
      total,
      active,
      inactive,
      withErrors,
      healthy: active - withErrors,
    };
  }, [connections]);

  /**
   * Get connections with enriched bank and account information
   */
  const getConnectionsWithBankInfo = useCallback((): ConnectionWithBankInfo[] => {
    return connections.map(connection => {
      // Find accounts for this connection
      const connectionAccounts = accounts.filter(
        account => account.id_connection === connection.id
      );

      // Get bank names for these accounts using connector info
      const bankNames = [
        ...new Set(
          connectionAccounts.map(account =>
            getBankNameFromAccount(account, connections, connectorMap)
          )
        ),
      ];

      // Calculate totals
      const totalBalance = connectionAccounts.reduce((sum, account) => sum + account.balance, 0);

      return {
        ...connection,
        bankNames,
        accountCount: connectionAccounts.length,
        totalBalance,
        accounts: connectionAccounts,
      };
    });
  }, [connections, accounts, connectorMap]);

  /**
   * Get bank information for a specific connection
   */
  const getConnectionBankInfo = useCallback(
    (connectionId: number) => {
      const connectionAccounts = accounts.filter(account => account.id_connection === connectionId);
      const bankNames = [
        ...new Set(
          connectionAccounts.map(account =>
            getBankNameFromAccount(account, connections, connectorMap)
          )
        ),
      ];
      const totalBalance = connectionAccounts.reduce((sum, account) => sum + account.balance, 0);

      return {
        bankNames,
        accountCount: connectionAccounts.length,
        totalBalance,
        accounts: connectionAccounts,
      };
    },
    [accounts, connections, connectorMap]
  );

  /**
   * Delete a connection
   */
  const deleteConnection = useCallback(
    async (connectionId: number) => {
      setSyncStatus({
        isLoading: true,
        connectionId,
        lastSync: null,
        error: null,
      });

      try {
        await AccountsService.deleteConnection(connectionId);

        // Remove the connection from the centralized state
        removeConnection(connectionId);

        setSyncStatus({
          isLoading: false,
          connectionId: null,
          lastSync: new Date().toISOString(),
          error: null,
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete connection';
        setSyncStatus({
          isLoading: false,
          connectionId,
          lastSync: null,
          error: errorMessage,
        });
        throw error;
      }
    },
    [removeConnection]
  );

  /**
   * Detect duplicate connections
   */
  const duplicateConnections = useMemo(() => {
    return detectDuplicateConnections(connections, accounts);
  }, [connections, accounts]);

  /**
   * Check if a connection is a duplicate
   */
  const isConnectionDuplicated = useCallback(
    (connectionId: number): boolean => {
      return isConnectionDuplicate(connectionId, duplicateConnections);
    },
    [duplicateConnections]
  );

  /**
   * Get duplicate information for a connection
   */
  const getConnectionDuplicateDetails = useCallback(
    (connectionId: number): DuplicateInfo | null => {
      return getConnectionDuplicateInfo(connectionId, duplicateConnections);
    },
    [duplicateConnections]
  );

  /**
   * Clear sync status
   */
  const clearSyncStatus = useCallback(() => {
    setSyncStatus({
      isLoading: false,
      connectionId: null,
      lastSync: null,
      error: null,
    });
  }, []);

  return {
    // State
    syncStatus,
    connections,
    accounts,
    isLoadingConnections,
    isLoadingAccounts,
    isLoadingConnectors,
    duplicateConnections,
    connectorMap,

    // Actions
    fetchConnectionsAndAccounts,
    syncConnection,
    syncAllConnections,
    deleteConnection,
    clearSyncStatus,

    // Helpers
    getConnection,
    getConnectionsMap,
    getConnectionsWithBankInfo,
    getConnectionBankInfo,
    getNextSyncTime,
    connectionNeedsAttention,
    getConnectionStatusSummary,
    isConnectionDuplicated,
    getConnectionDuplicateDetails,
  };
};
