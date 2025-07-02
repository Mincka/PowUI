// Re-export from the new utility files for backward compatibility
export { formatCurrency, getAccountTypeDisplayName, getAccountTypeColor } from './currencyUtils';
export {
  calculateNetWorth,
  calculateTotalAssets,
  calculateTotalLiabilities,
  analyzeAccounts,
  getCompleteFinancialSummary,
  getActifPassifBreakdown,
  getInvestmentPerformanceData,
} from './financialCalculations';
export {
  getAccountsByTypeChartData,
  getBalanceEvolutionChartData,
  getBanksByBalanceChartData,
} from './chartDataUtils';
export {
  guessBankFromAccount,
  organizeAccountsByBank,
  organizeAccountsByBankWithConnectors,
  getBankNameFromAccount,
} from './bankUtils';
