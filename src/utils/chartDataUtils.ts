import { Account, AccountsByType, AccountsByBank, Connection, Connector } from '../types/accounts';
import { getAccountTypeDisplayName, getAccountTypeColor } from './currencyUtils';
import { ConnectorService } from '../services/connectorService';

/**
 * Chart data generation utilities
 */

export const getAccountsByTypeChartData = (accountsByType: AccountsByType) => {
  const filteredAccountsByType = Object.fromEntries(
    Object.entries(accountsByType).filter(([type]) => type !== 'loan' && type !== 'card')
  );

  const labels = Object.keys(filteredAccountsByType).map(getAccountTypeDisplayName);
  const data = Object.values(filteredAccountsByType).map(accounts =>
    accounts.reduce((sum, account) => sum + Math.abs(account.balance), 0)
  );
  const backgroundColor = Object.keys(filteredAccountsByType).map(getAccountTypeColor);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderColor: backgroundColor.map(color => color),
        borderWidth: 2,
      },
    ],
  };
};

export const getBalanceEvolutionChartData = (accounts: Account[]) => {
  // Filter out cards and get accounts with meaningful balances
  const meaningfulAccounts = accounts.filter(
    account => account.type !== 'card' && Math.abs(account.balance) > 0
  );

  const labels = meaningfulAccounts.map(account => account.name);
  const currentBalances = meaningfulAccounts.map(account => account.balance);
  const comingBalances = meaningfulAccounts.map(account => account.coming_balance);

  return {
    labels,
    datasets: [
      {
        label: 'Solde Actuel',
        data: currentBalances,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
      },
      {
        label: 'Solde Prévisionnel',
        data: comingBalances,
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 2,
      },
    ],
  };
};

export const getBanksByBalanceChartData = (
  accountsByBank: AccountsByBank,
  connections: Connection[] = [],
  connectorMap?: Map<number, Connector>
) => {
  const banks = Object.values(accountsByBank)
    .map(bank => ({
      ...bank,
      accounts: bank.accounts.filter(account => account.type !== 'loan' && account.type !== 'card'),
    }))
    .filter(bank => bank.accounts.length > 0);

  banks.forEach(bank => {
    bank.totalBalance = bank.accounts.reduce((sum, account) => sum + account.balance, 0);
  });

  const labels = banks.map(bank => bank.name);
  const data = banks.map(bank => Math.abs(bank.totalBalance));
  const backgroundColor = banks.map(bank => {
    if (bank.accounts.length > 0 && connections.length > 0 && connectorMap) {
      const account = bank.accounts[0];
      if (account.id_connection) {
        const connection = connections.find(conn => conn.id === account.id_connection);
        if (connection && connection.id_connector) {
          const connectorInfo = ConnectorService.getConnectorInfo(
            connection.id_connector,
            connectorMap
          );
          if (connectorInfo.color) {
            return connectorInfo.color;
          }
        }
      }
    }
    return undefined;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Solde par Banque',
        data,
        backgroundColor,
        borderColor: backgroundColor,
        borderWidth: 2,
      },
    ],
  };
};
