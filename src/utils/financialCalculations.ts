import { Account, AccountsResponse, AccountsByType, AccountSummary } from '../types/accounts';
import { CompleteFinancialSummary } from '../types/realEstate';
import realEstateService from '../services/realEstateService';

/**
 * Financial calculation utilities
 */

export const calculateNetWorth = (accounts: Account[]): number => {
  return accounts.reduce((total, account) => {
    // Don't include cards in net worth calculation as they represent pending transactions
    if (account.type === 'card') return total;
    return total + account.balance;
  }, 0);
};

export const calculateTotalAssets = (accounts: Account[]): number => {
  return accounts
    .filter(account => account.balance > 0 && account.type !== 'card')
    .reduce((total, account) => total + account.balance, 0);
};

export const calculateTotalLiabilities = (accounts: Account[]): number => {
  return Math.abs(
    accounts
      .filter(account => account.balance < 0 && account.type !== 'card')
      .reduce((total, account) => total + account.balance, 0)
  );
};

export const analyzeAccounts = (data: AccountsResponse): AccountSummary => {
  const { accounts, balance, coming_balances } = data;

  // Group accounts by type
  const accountsByType: AccountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {} as AccountsByType);

  // Get unique account types
  const accountTypes = Object.keys(accountsByType);

  // Separate positive and negative accounts
  const positiveAccounts = accounts.filter(account => account.balance > 0);
  const negativeAccounts = accounts.filter(account => account.balance < 0);

  // Investment accounts (with calculated fields)
  const investmentAccounts = accounts.filter(
    account => account.calculated && account.calculated.length > 0
  );

  // Calculate total coming balance
  const totalComingBalance = Object.values(coming_balances).reduce((sum, value) => sum + value, 0);

  return {
    totalBalance: balance,
    totalComingBalance,
    accountTypes,
    accountsByType,
    positiveAccounts,
    negativeAccounts,
    investmentAccounts,
  };
};

export const getCompleteFinancialSummary = (
  accountsData: AccountsResponse,
  ignoreApiDebts: boolean = false
): CompleteFinancialSummary => {
  const { accounts } = accountsData;
  const realEstate = realEstateService.getRealEstateSummary();

  // Calculate account totals
  const totalAccountAssets = calculateTotalAssets(accounts);
  const totalAccountLiabilities = ignoreApiDebts ? 0 : calculateTotalLiabilities(accounts);
  const totalAccountsBalance = ignoreApiDebts ? totalAccountAssets : calculateNetWorth(accounts);

  // Calculate combined totals
  const totalAssets = totalAccountAssets + realEstate.totalPropertyValue;
  const totalLiabilities = totalAccountLiabilities + realEstate.totalMortgageBalance;
  const netWorth = totalAssets - totalLiabilities;

  return {
    accounts,
    totalAccountsBalance,
    totalAccountAssets,
    totalAccountLiabilities,
    realEstate,
    totalAssets,
    totalLiabilities,
    netWorth,
  };
};

export const getActifPassifBreakdown = (summary: CompleteFinancialSummary) => {
  return {
    actif: {
      comptes_financiers: summary.totalAccountAssets,
      immobilier: summary.realEstate.totalPropertyValue,
      total: summary.totalAssets,
    },
    passif: {
      dettes_comptes: summary.totalAccountLiabilities,
      credits_immobiliers: summary.realEstate.totalMortgageBalance,
      total: summary.totalLiabilities,
    },
    patrimoine_net: summary.netWorth,
  };
};

export const getInvestmentPerformanceData = (investmentAccounts: Account[]) => {
  return investmentAccounts.map(account => ({
    name: account.name,
    balance: account.balance,
    valuation: account.valuation || account.balance,
    diff: account.diff || 0,
    diffPercent: account.diff_percent || 0,
    type: account.type,
  }));
};
