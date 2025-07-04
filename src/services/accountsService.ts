import { AccountsResponse, ConnectionsResponse, Connection } from '../types/accounts';
import {
  ApiConfig,
  defaultApiConfig,
  validateApiConfig,
  getAccountsUrl,
  getBaseUrl,
  getApiConfigValidationErrors,
} from '../config/api';
import { mockAccountsData } from '../data/mockData';

export class AccountsService {
  private static config: ApiConfig = defaultApiConfig;

  // Method to update API configuration
  static setConfig(config: Partial<ApiConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  // Method to get current configuration
  static getConfig(): ApiConfig {
    return { ...this.config };
  }

  static async fetchAccounts(customConfig?: ApiConfig): Promise<AccountsResponse> {
    const config = customConfig || this.config;

    if (!validateApiConfig(config)) {
      throw new Error(`API configuration is incomplete for ${config.mode} mode.`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.getMockData();
      case 'direct':
      default:
        return this.fetchFromBiApi(config);
    }
  }

  private static async fetchFromBiApi(config: ApiConfig): Promise<AccountsResponse> {
    try {
      const apiUrl = getAccountsUrl(config);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `HTTP ${response.status}`;
        let errorDetails = '';

        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
            if (errorData.request_id) {
              errorDetails = `Request ID: ${errorData.request_id}`;
            }
          }
        } catch {
          // If we can't parse the error response, use default message
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 401:
            throw new Error(
              `Unauthorized: ${errorMessage}. Please check your bearer token. ${errorDetails}`
            );
          case 404:
            throw new Error(
              `Resource not found: ${errorMessage}. Please verify your domain and user ID. ${errorDetails}`
            );
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to access this resource. ${errorDetails}`
            );
          case 429:
            throw new Error(
              `Rate limit exceeded: ${errorMessage}. Please try again later. ${errorDetails}`
            );
          case 500:
            throw new Error(
              `Server error: ${errorMessage}. Please try again later. ${errorDetails}`
            );
          default:
            throw new Error(`API Error: ${errorMessage}. ${errorDetails}`);
        }
      }

      const data: AccountsResponse = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: Expected JSON object');
      }

      if (!Array.isArray(data.accounts)) {
        throw new Error('Invalid response format: Missing or invalid accounts array');
      }

      // Filter out accounts with null id_connection
      const filteredAccounts = data.accounts.filter(account => account.id_connection !== null);

      return {
        ...data,
        accounts: filteredAccounts,
        total: filteredAccounts.length,
      };
    } catch (error) {
      console.error('Error fetching accounts from BiAPI:', error);
      throw error;
    }
  }

  /**
   * Fetch connections for the current user
   */
  static async fetchConnections(customConfig?: ApiConfig): Promise<ConnectionsResponse> {
    const config = customConfig || this.config;

    if (!validateApiConfig(config)) {
      const missingFields = getApiConfigValidationErrors(config);
      const missingFieldsList = missingFields.join(', ');
      throw new Error(`API configuration is incomplete for ${config.mode} mode. Missing fields: ${missingFieldsList}`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.getMockConnections();
      case 'direct':
      default:
        return this.fetchConnectionsFromBiApi(config);
    }
  }

  private static async fetchConnectionsFromBiApi(config: ApiConfig): Promise<ConnectionsResponse> {
    try {
      const baseUrl = getBaseUrl(config);
      const apiUrl = `${baseUrl}/connections`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch connections: HTTP ${response.status}`);
      }

      const data: ConnectionsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching connections from BiAPI:', error);
      throw error;
    }
  }

  /**
   * Sync a specific connection
   */
  static async syncConnection(connectionId: number, customConfig?: ApiConfig): Promise<Connection> {
    const config = customConfig || this.config;

    if (!validateApiConfig(config)) {
      throw new Error(`API configuration is incomplete for ${config.mode} mode.`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.mockSyncConnection(connectionId);
      case 'direct':
      default:
        return this.syncConnectionFromBiApi(connectionId, config);
    }
  }

  private static async syncConnectionFromBiApi(
    connectionId: number,
    config: ApiConfig
  ): Promise<Connection> {
    try {
      const baseUrl = getBaseUrl(config);
      const apiUrl = `${baseUrl}/connections/${connectionId}`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(`Failed to sync connection: ${errorMessage}`);
      }

      const connection: Connection = await response.json();
      return connection;
    } catch (error) {
      console.error('Error syncing connection:', error);
      throw error;
    }
  }

  /**
   * Sync all connections for the current user
   */
  static async syncAllConnections(customConfig?: ApiConfig): Promise<Connection[]> {
    const config = customConfig || this.config;

    try {
      // First, get all connections
      const connectionsResponse = await this.fetchConnections(config);
      const connections = connectionsResponse.connections;

      // Filter active connections only
      const activeConnections = connections.filter(conn => conn.active);

      // Sync each connection
      const syncPromises = activeConnections.map(conn =>
        this.syncConnection(conn.id, config).catch(error => {
          console.error(`Failed to sync connection ${conn.id}:`, error);
          return null;
        })
      );

      const results = await Promise.all(syncPromises);
      return results.filter(result => result !== null) as Connection[];
    } catch (error) {
      console.error('Error syncing all connections:', error);
      throw error;
    }
  }

  /**
   * Delete a connection
   */
  static async deleteConnection(connectionId: number, customConfig?: ApiConfig): Promise<void> {
    const config = customConfig || this.config;

    if (!validateApiConfig(config)) {
      throw new Error(`API configuration is incomplete for ${config.mode} mode.`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.mockDeleteConnection(connectionId);
      case 'direct':
      default:
        return this.deleteConnectionFromBiApi(connectionId, config);
    }
  }

  private static async deleteConnectionFromBiApi(
    connectionId: number,
    config: ApiConfig
  ): Promise<void> {
    try {
      const baseUrl = getBaseUrl(config);
      const apiUrl = `${baseUrl}/connections/${connectionId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Please check your bearer token.`);
          case 404:
            throw new Error(
              `Connection not found: ${errorMessage}. The connection may have already been deleted.`
            );
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to delete this connection.`
            );
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to delete connection: ${errorMessage}`);
        }
      }

      // Success - 204 No Content expected
    } catch (error) {
      console.error('Error deleting connection from BiAPI:', error);
      throw error;
    }
  }

  private static async mockDeleteConnection(connectionId: number): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Mock: Deleted connection ${connectionId}`);
    // In mock mode, we just simulate success
  }

  /**
   * Get connections organized by their unique IDs from accounts
   */
  static async getConnectionsFromAccounts(
    accounts: AccountsResponse['accounts']
  ): Promise<Map<number, Connection>> {
    const connectionIds = new Set(accounts.map(account => account.id_connection));
    const connectionsResponse = await this.fetchConnections();

    const connectionsMap = new Map<number, Connection>();
    connectionsResponse.connections.forEach(connection => {
      if (connectionIds.has(connection.id)) {
        connectionsMap.set(connection.id, connection);
      }
    });

    return connectionsMap;
  }

  /**
   * Mock methods for development
   */
  private static getMockConnections(): ConnectionsResponse {
    return {
      connections: [
        {
          id: 8, // BoursoBank connection (matches accounts with id_connection: 8)
          id_user: 8,
          id_connector: 101, // BoursoBank connector
          state: null,
          error: null,
          error_message: null,
          last_update: new Date().toISOString(),
          created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          active: true,
          last_push: null,
          expire: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
          connector_uuid: 'boursobank-demo-uuid',
          next_try: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        },
        {
          id: 17, // Fortuneo connection (matches accounts with id_connection: 17)
          id_user: 8,
          id_connector: 102, // Fortuneo connector
          state: null,
          error: null,
          error_message: null,
          last_update: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          created: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          active: true,
          last_push: null,
          expire: new Date(Date.now() + 86400000 * 25).toISOString(), // 25 days from now
          connector_uuid: 'fortuneo-demo-uuid',
          next_try: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        },
        {
          id: 25, // Bourse Direct connection (matches accounts with id_connection: 25)
          id_user: 8,
          id_connector: 103, // Bourse Direct connector
          state: null,
          error: null,
          error_message: null,
          last_update: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          created: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          active: true,
          last_push: null,
          expire: new Date(Date.now() + 86400000 * 28).toISOString(), // 28 days from now
          connector_uuid: 'bourse-direct-demo-uuid',
          next_try: new Date(Date.now() + 5400000).toISOString(), // 1.5 hours from now
        },
      ],
    };
  }

  private static async mockSyncConnection(connectionId: number): Promise<Connection> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      id: connectionId,
      id_user: 1,
      id_connector: 40,
      state: null,
      error: null,
      error_message: null,
      last_update: new Date().toISOString(),
      created: new Date(Date.now() - 86400000).toISOString(),
      active: true,
      last_push: null,
      expire: new Date(Date.now() + 86400000 * 30).toISOString(),
      connector_uuid: 'test-connector-uuid',
      next_try: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  /**
   * Get temporary code for new connection setup
   */
  static async getTemporaryCode(customConfig?: ApiConfig): Promise<{ code: string }> {
    const config = customConfig || this.config;

    if (!validateApiConfig(config)) {
      throw new Error(`API configuration is incomplete for ${config.mode} mode.`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.getMockTemporaryCode();
      case 'direct':
      default:
        return this.getTemporaryCodeFromBiApi(config);
    }
  }

  private static async getTemporaryCodeFromBiApi(config: ApiConfig): Promise<{ code: string }> {
    try {
      const apiUrl = `${config.apiUrl}auth/token/code?type=singleAccess`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Please check your bearer token.`);
          case 404:
            throw new Error(`Resource not found: ${errorMessage}. Please verify your domain.`);
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to generate temporary codes.`
            );
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to get temporary code: ${errorMessage}`);
        }
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object' || !data.code) {
        throw new Error('Invalid response format: Expected object with code field');
      }

      return { code: data.code };
    } catch (error) {
      console.error('Error getting temporary code from BiAPI:', error);
      throw error;
    }
  }

  private static async getMockTemporaryCode(): Promise<{ code: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate a mock temporary code
    const mockCode = `TEMP_${Math.random().toString(36).substr(2, 16).toUpperCase()}`;
    return { code: mockCode };
  }

  /**
   * Build webview URL for new connection setup
   */
  static buildWebviewUrl(
    clientId: string,
    temporaryCode: string,
    customConfig?: ApiConfig
  ): string {
    const config = customConfig || this.config;

    const redirectUri = encodeURIComponent(
      'https://integrate.budget-insight.com/demos/connect/callback'
    );
    return `${config.apiUrl}auth/webview/connect?redirect_uri=${redirectUri}&client_id=${encodeURIComponent(clientId)}&code=${encodeURIComponent(temporaryCode)}`;
  }

  /**
   * Build webview URL for managing an existing connection
   */
  static buildManageWebviewUrl(
    connectionId: number,
    temporaryCode: string,
    customConfig?: ApiConfig,
    lang: string = 'fr'
  ): string {
    const config = customConfig || this.config;

    // Extract domain from apiUrl for webview
    const domain = config.apiUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const redirectUri = encodeURIComponent(
      'https://integrate.budget-insight.com/demos/connect/callback'
    );
    return `https://webview.powens.com/${lang}/manage?domain=${domain}&client_id=${encodeURIComponent(config.clientId)}&code=${encodeURIComponent(temporaryCode)}&connection_id=${connectionId}&redirect_uri=${redirectUri}`;
  }

  /**
   * Build webview URL for re-authenticating an existing connection
   */
  static buildReconnectWebviewUrl(
    connectionId: number,
    temporaryCode: string,
    customConfig?: ApiConfig,
    lang: string = 'fr'
  ): string {
    const config = customConfig || this.config;

    // Extract domain from apiUrl for webview
    const domain = config.apiUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const redirectUri = encodeURIComponent(
      'https://integrate.budget-insight.com/demos/connect/callback'
    );
    return `https://webview.powens.com/${lang}/reconnect?domain=${domain}&client_id=${encodeURIComponent(config.clientId)}&code=${encodeURIComponent(temporaryCode)}&connection_id=${connectionId}&redirect_uri=${redirectUri}`;
  }

  /**
   * Returns mock data for development and testing
   * Mock data is now maintained in a separate file for better organization
   */
  static getMockData(): AccountsResponse {
    const mockData = mockAccountsData;

    // Filter out accounts with null id_connection for consistency
    const filteredAccounts = mockData.accounts.filter(account => account.id_connection !== null);

    return {
      ...mockData,
      accounts: filteredAccounts,
      total: filteredAccounts.length,
    };
  }
}
