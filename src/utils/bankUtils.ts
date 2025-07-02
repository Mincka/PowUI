import { Account, AccountsByBank, Connector, Connection } from '../types/accounts';
import { ConnectorService } from '../services/connectorService';

/**
 * Bank management utility functions
 * Uses connector data from Powens API for accurate bank identification
 */

export const guessBankFromAccount = (account: Account): string => {
  // Try to guess bank from BIC code
  if (account.bic) {
    const bic = account.bic.toUpperCase();
    if (bic.includes('BNPP')) return 'BNP Paribas';
    if (bic.includes('CRLY')) return 'Crédit Lyonnais';
    if (bic.includes('AGRI')) return 'Crédit Agricole';
    if (bic.includes('BRED')) return 'BRED';
    if (bic.includes('CCBP')) return 'Crédit Coopératif';
    if (bic.includes('CEPA')) return "Caisse d'Épargne";
    if (bic.includes('CMCI')) return 'Crédit Mutuel';
    if (bic.includes('HSBC')) return 'HSBC';
    if (bic.includes('SGAB')) return 'Société Générale';
    if (bic.includes('INGE')) return 'ING Direct';
    if (bic.includes('REVO')) return 'Revolut';
    if (bic.includes('N26')) return 'N26';
  }

  // Try to guess from account name or original name
  const accountName = (account.name + ' ' + account.original_name).toLowerCase();
  if (accountName.includes('bnp') || accountName.includes('paribas')) return 'BNP Paribas';
  if (accountName.includes('crédit lyonnais') || accountName.includes('lcl'))
    return 'Crédit Lyonnais';
  if (accountName.includes('crédit agricole') || accountName.includes('ca '))
    return 'Crédit Agricole';
  if (accountName.includes('bred')) return 'BRED';
  if (accountName.includes('société générale') || accountName.includes('sg '))
    return 'Société Générale';
  if (accountName.includes('crédit mutuel') || accountName.includes('cm ')) return 'Crédit Mutuel';
  if (accountName.includes("caisse d'épargne") || accountName.includes('ce '))
    return "Caisse d'Épargne";
  if (accountName.includes('hsbc')) return 'HSBC';
  if (accountName.includes('ing')) return 'ING Direct';
  if (accountName.includes('revolut')) return 'Revolut';
  if (accountName.includes('n26')) return 'N26';
  if (accountName.includes('boursorama')) return 'Boursorama';
  if (accountName.includes('orange bank')) return 'Orange Bank';

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
