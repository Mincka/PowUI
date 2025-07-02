export interface Currency {
  id: string;
  symbol: string;
  prefix: boolean;
  crypto: boolean;
  precision: number;
  marketcap: number | null;
  datetime: string | null;
  name: string;
}

export interface Loan {
  id: number;
  id_account: number;
  contact_name: string | null;
  total_amount: number;
  available_amount: number | null;
  used_amount: number | null;
  insurance_amount: number | null;
  insurance_rate: number | null;
  subscription_date: string;
  maturity_date: string;
  next_payment_amount: number;
  next_payment_date: string;
  rate: number;
  nb_payments_left: number;
  nb_payments_done: number | null;
  nb_payments_total: number;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  account_label: string | null;
  insurance_label: string | null;
  duration: number | null;
  start_repayment_date: string | null;
  deferred: boolean | null;
  type: string;
  id_type: number;
}

export interface Account {
  id: number;
  id_connection: number;
  id_user: number;
  id_source: number;
  id_parent: number | null;
  number: string;
  webid: string;
  original_name: string;
  balance: number;
  coming: number | null;
  display: boolean;
  last_update: string;
  deleted: string | null;
  disabled: string | null;
  iban: string | null;
  currency: Currency;
  id_type: number;
  bookmarked: number;
  name: string;
  error: string | null;
  usage: string | null;
  ownership: string | null;
  company_name: string | null;
  opening_date: string | null;
  bic: string | null;
  coming_balance: number;
  formatted_balance: string;
  type: string;
  calculated?: string[];
  valuation?: number;
  diff?: number;
  diff_percent?: number;
  prev_diff?: number;
  prev_diff_percent?: number;
  information: Record<string, unknown>;
  loan: Loan | null;
}

export interface Connection {
  id: number;
  id_user: number;
  id_connector: number;
  state: string | null;
  error: string | null;
  error_message: string | null;
  last_update: string | null;
  created: string | null;
  active: boolean;
  last_push: string | null;
  expire: string | null;
  connector_uuid: string;
  next_try: string | null;
}

export interface ConnectionsResponse {
  connections: Connection[];
}

export interface SyncStatus {
  isLoading: boolean;
  connectionId: number | null;
  lastSync: string | null;
  error: string | null;
}

export interface AccountsResponse {
  balance: number;
  balances: Record<string, number>;
  coming_balances: Record<string, number>;
  accounts: Account[];
  total: number;
}

export interface AccountsByType {
  [key: string]: Account[];
}

export interface AccountSummary {
  totalBalance: number;
  totalComingBalance: number;
  accountTypes: string[];
  accountsByType: AccountsByType;
  positiveAccounts: Account[];
  negativeAccounts: Account[];
  investmentAccounts: Account[];
}

export interface BankInfo {
  name: string;
  accounts: Account[];
  totalBalance: number;
  totalComingBalance: number;
}

export interface AccountsByBank {
  [bankName: string]: BankInfo;
}

export interface Connector {
  id: number;
  name: string;
  hidden: boolean;
  charged: boolean;
  code: string | null;
  beta: boolean;
  color: string;
  slug: string;
  sync_periodicity: unknown;
  months_to_fetch: unknown;
  siret: unknown;
  uuid: string;
  restricted: boolean;
  stability: {
    status: string;
    last_update: string;
  };
  capabilities: string[];
  available_auth_mechanisms: string[];
  categories: unknown[];
  auth_mechanism: string;
  account_types: string[];
  account_usages: string[];
  products: string[];
}

export interface ConnectorsResponse {
  connectors: Connector[];
  total: number;
}

export interface ConnectorCache {
  data: { [key: string]: Connector };
  timestamp: number;
  version: string;
  domain: string;
}

export interface PowensUser {
  id: number; // The id_user from Powens
  authToken: string; // The auth_token from Powens
  type: string; // 'permanent' or other types
  name?: string; // Optional display name for the user
  createdAt: string; // When the user was created locally
  isActive: boolean; // Currently active user
}

export interface PowensUserCreateRequest {
  client_id: string;
  client_secret: string;
}

export interface PowensUserCreateResponse {
  auth_token: string;
  type: string;
  id_user: number;
}

export interface PowensTokenRenewRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  id_user: number;
  revoke_previous?: boolean;
}

export interface PowensTokenRenewResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface PowensApiUser {
  id: number;
  // Add other properties that come from the API
  active?: boolean;
  created?: string;
  expire?: string;
}

export interface PowensUsersListResponse {
  users: PowensApiUser[];
}

export interface CombinedUserData {
  apiUser: PowensApiUser;
  localUser: PowensUser | null; // null if not configured locally
  isConfigured: boolean;
}
