import { Currency } from './accounts';

export interface TransactionsList {
  transactions: Transaction[];
  first_date: string;
  last_date: string;
  result_min_date: string;
  result_max_date: string;
  _links: PaginationLinks;
}

export interface PaginationLinks {
  current: string;
  next?: string;
  previous?: string;
}

export interface Transaction {
  id: number;
  id_account: number;
  application_date: string | null;
  date: string;
  datetime: string | null;
  vdate: string | null;
  vdatetime: string | null;
  rdate: string;
  rdatetime: string | null;
  bdate: string | null; // Deprecated
  bdatetime: string | null; // Deprecated
  value: number | null;
  gross_value: number | null;
  type: TransactionType;
  original_wording: string;
  simplified_wording: string;
  wording: string | null;
  categories: Category[];
  date_scraped: string;
  coming: boolean;
  active: boolean;
  id_cluster: number | null;
  comment: string | null;
  last_update: string | null;
  deleted: string | null;
  original_value: number | null;
  original_gross_value: number | null;
  original_currency: Currency | null;
  commission: number | null;
  commission_currency: Currency | null;
  country: string | null; // Deprecated
  card: string | null;
  counterparty: Counterparty | null;
}

export enum TransactionType {
  TRANSFER = 'transfer',
  ORDER = 'order',
  CHECK = 'check',
  DEPOSIT = 'deposit',
  PAYBACK = 'payback',
  WITHDRAWAL = 'withdrawal',
  LOAN_REPAYMENT = 'loan_repayment',
  BANK = 'bank',
  CARD = 'card',
  DEFERRED_CARD = 'deferred_card',
  SUMMARY_CARD = 'summary_card',
  UNKNOWN = 'unknown',
  MARKET_ORDER = 'market_order',
  MARKET_FEE = 'market_fee',
  ARBITRAGE = 'arbitrage',
  PROFIT = 'profit',
  REFUND = 'refund',
  PAYOUT = 'payout',
  PAYMENT = 'payment',
  FEE = 'fee',
}

export interface Category {
  code: string;
  parent_code: string | null;
}

export interface Counterparty {
  label: string | null;
  account_scheme_name: AccountSchemeName | null;
  account_identification: string | null;
  type: string | null; // 'creditor' or 'debtor'
}

export enum AccountSchemeName {
  IBAN = 'iban',
  BBAN = 'bban',
  SORT_CODE_ACCOUNT_NUMBER = 'sort_code_account_number',
  CPAN = 'cpan',
  TPAN = 'tpan',
}

export interface TransactionUpdateRequest {
  wording?: string;
  application_date?: string;
  categories?: Category[];
  comment?: string;
  active?: boolean;
}

export interface TransactionFilters {
  limit?: number;
  minDate?: string;
  maxDate?: string;
  income?: boolean;
  search?: string;
  offset?: number;
  accountId?: number;
  type?: TransactionType;
  minValue?: number;
  maxValue?: number;
  lastUpdate?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
}
