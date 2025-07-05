import { Account, AccountsByBank, Connector, Connection } from '../types/accounts';
import { ConnectorService } from '../services/connectorService';

/**
 * Bank management utility functions
 * Uses connector data from Powens API for accurate bank identification
 */

export const guessBankFromAccount = (account: Account): string => {
  // Map connection IDs to specific bank names for demo data
  if (account.id_connection === 8) return 'BoursoBank';
  if (account.id_connection === 17) return 'Fortuneo';
  if (account.id_connection === 25) return 'Bourse Direct';

  // Fallback to generic bank name if no specific connection ID matches
  return 'Banque Inconnue';
};

/**
 * Get bank name from connector data or fallback to guessing
 * @param account The account to get bank name for
 * @param connections Array of connections to map account.id_connection → connection.id_connector
 * @param connectorMap Map of connector_id → Connector data
 */
export const getBankNameFromAccount = (
  account: Account,
  connections: Connection[] = [],
  connectorMap?: Map<number, Connector>
): string => {
  // Try to get bank name from connector data first
  if (account.id_connection && connections.length > 0 && connectorMap) {
    // Find the connection for this account
    const connection = connections.find(conn => conn.id === account.id_connection);
    if (connection && connection.id_connector) {
      // Get connector info using the connector ID from the connection
      const connectorInfo = ConnectorService.getConnectorInfo(
        connection.id_connector,
        connectorMap
      );
      if (connectorInfo.name !== `Connector ${connection.id_connector}`) {
        return connectorInfo.name;
      }
    }
  }

  // Fallback to guessing from account data
  return guessBankFromAccount(account);
};

/**
 * Organize accounts by bank using connector data
 * @param accounts Array of accounts to organize
 * @param connections Array of connections to map accounts to connectors
 * @param connectorMap Map of connector data from ConnectorService
 */
export const organizeAccountsByBankWithConnectors = (
  accounts: Account[],
  connections: Connection[] = [],
  connectorMap?: Map<number, Connector>
): AccountsByBank => {
  const accountsByBank: AccountsByBank = {};

  accounts.forEach(account => {
    // Get bank name from connector data or fallback to guessing
    const bankName = getBankNameFromAccount(account, connections, connectorMap);

    // Initialize bank info if not exists
    if (!accountsByBank[bankName]) {
      accountsByBank[bankName] = {
        name: bankName,
        accounts: [],
        totalBalance: 0,
        totalComingBalance: 0,
      };
    }

    // Add account to bank
    accountsByBank[bankName].accounts.push(account);

    // Only add to total balance if it's not a loan account
    if (account.type !== 'loan') {
      accountsByBank[bankName].totalBalance += account.balance;
    }

    accountsByBank[bankName].totalComingBalance += account.coming_balance;
  });

  return accountsByBank;
};

/**
 * Generate a consistent random color for a bank name
 * @param bankName The name of the bank to generate a color for
 * @returns A CSS color string (HSL format)
 */
export const generateBankColor = (bankName: string): string => {
  // Create a simple hash from the bank name for consistency
  let hash = 0;
  for (let i = 0; i < bankName.length; i++) {
    const char = bankName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use the hash to generate HSL values
  const hue = Math.abs(hash) % 360; // 0-359 degrees
  const saturation = 45 + (Math.abs(hash) % 30); // 45-75% saturation for pleasant colors
  const lightness = 35 + (Math.abs(hash) % 20); // 35-55% lightness for good contrast

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Check if a bank is considered "unknown" and should get a random color
 * @param bankName The name of the bank to check
 * @returns True if the bank should get a random color
 */
export const isUnknownBank = (bankName: string): boolean => {
  const knownBanks = [
    'BNP Paribas',
    'Crédit Lyonnais',
    'Crédit Agricole',
    'BRED',
    'Crédit Coopératif',
    "Caisse d'Épargne",
    'Crédit Mutuel',
    'HSBC',
    'Société Générale',
    'ING Direct',
    'Revolut',
    'N26',
    'Boursorama',
    'Orange Bank',
  ];

  return !knownBanks.includes(bankName) || bankName === 'Banque Inconnue';
};

/**
 * Backward-compatible function for organizing accounts by bank
 * Falls back to guessing bank names from account data
 * @param accounts Array of accounts to organize
 */
export const organizeAccountsByBank = (accounts: Account[]): AccountsByBank => {
  const accountsByBank: AccountsByBank = {};

  accounts.forEach(account => {
    // Fallback to guessing bank name from account data
    const bankName = guessBankFromAccount(account);

    // Initialize bank info if not exists
    if (!accountsByBank[bankName]) {
      accountsByBank[bankName] = {
        name: bankName,
        accounts: [],
        totalBalance: 0,
        totalComingBalance: 0,
      };
    }

    // Add account to bank
    accountsByBank[bankName].accounts.push(account);
    accountsByBank[bankName].totalBalance += account.balance;
    accountsByBank[bankName].totalComingBalance += account.coming_balance;
  });

  return accountsByBank;
};
