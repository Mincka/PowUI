import {
  TransactionsList,
  TransactionFilters,
  Transaction,
  TransactionType,
} from '../types/transactions';
import { ApiConfig, validateApiConfig, getBaseUrl } from '../config/api';
import { AccountsService } from './accountsService';

export class TransactionService {
  // Use AccountsService configuration instead of maintaining our own
  static getConfig(): ApiConfig {
    return AccountsService.getConfig();
  }

  static async fetchTransactions(
    filters: TransactionFilters = {},
    customConfig?: ApiConfig
  ): Promise<TransactionsList> {
    const config = customConfig || this.getConfig();

    if (!validateApiConfig(config)) {
      throw new Error(`API configuration is incomplete for ${config.mode} mode.`);
    }

    // Handle different modes
    switch (config.mode) {
      case 'mock':
        return this.getMockTransactions(filters);
      case 'direct':
      default:
        return this.fetchFromBiApi(filters, config);
    }
  }

  static async fetchAccountTransactions(
    accountId: number,
    filters: Omit<TransactionFilters, 'accountId'> = {},
    customConfig?: ApiConfig
  ): Promise<TransactionsList> {
    return this.fetchTransactions({ ...filters, accountId }, customConfig);
  }

  private static async fetchFromBiApi(
    filters: TransactionFilters,
    config: ApiConfig
  ): Promise<TransactionsList> {
    try {
      const baseUrl = getBaseUrl(config);
      const params = this.buildQueryParams(filters);
      const apiUrl = filters.accountId
        ? `${baseUrl}/accounts/${filters.accountId}/transactions?${params}`
        : `${baseUrl}/transactions?${params}`;

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
              `Resource not found: ${errorMessage}. Please verify your domain and account ID. ${errorDetails}`
            );
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to access this resource. ${errorDetails}`
            );
          case 409:
            throw new Error(
              `No bank account is activated: ${errorMessage}. Please activate a bank account first. ${errorDetails}`
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

      const data: TransactionsList = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: Expected JSON object');
      }

      if (!Array.isArray(data.transactions)) {
        throw new Error('Invalid response format: Missing or invalid transactions array');
      }

      return data;
    } catch (error) {
      console.error('Error fetching transactions from BiAPI:', error);
      throw error;
    }
  }

  private static buildQueryParams(filters: TransactionFilters): string {
    const params = new URLSearchParams();

    // Always require limit for pagination
    params.append('limit', (filters.limit || 30).toString());

    if (filters.minDate) {
      params.append('min_date', filters.minDate);
    }

    if (filters.maxDate) {
      params.append('max_date', filters.maxDate);
    }

    if (filters.search) {
      params.append('wording', filters.search);
    }

    if (filters.minValue !== undefined) {
      params.append('min_value', filters.minValue.toString());
    }

    if (filters.maxValue !== undefined) {
      params.append('max_value', filters.maxValue.toString());
    }

    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    if (filters.lastUpdate) {
      params.append('last_update', filters.lastUpdate);
    }

    return params.toString();
  }

  /**
   * Calculate transaction summary for a list of transactions
   */
  static calculateSummary(transactions: Transaction[]) {
    const summary = transactions.reduce(
      (acc, transaction) => {
        if (transaction.value === null || !transaction.active) return acc;

        if (transaction.value > 0) {
          acc.totalIncome += transaction.value;
        } else {
          acc.totalExpenses += Math.abs(transaction.value);
        }

        acc.transactionCount++;
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0, transactionCount: 0 }
    );

    return {
      ...summary,
      netAmount: summary.totalIncome - summary.totalExpenses,
      averageTransaction:
        summary.transactionCount > 0
          ? (summary.totalIncome - summary.totalExpenses) / summary.transactionCount
          : 0,
    };
  }

  /**
   * Get default date range (last 30 days)
   */
  static getDefaultDateRange(): { minDate: string; maxDate: string } {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      minDate: thirtyDaysAgo.toISOString().split('T')[0],
      maxDate: today.toISOString().split('T')[0],
    };
  }

  /**
   * Mock data methods for development
   */
  private static async getMockTransactions(filters: TransactionFilters): Promise<TransactionsList> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate account-specific mock transactions
    const accountId = filters.accountId || 7890;
    const seed = accountId * 123; // Use account ID to generate different data for each account

    const mockTransactionTemplates = [
      // General transactions
      {
        type: TransactionType.CARD,
        original_wording: 'CARREFOUR MARKET PARIS 15',
        simplified_wording: 'Carrefour Market',
        wording: 'Courses alimentaires',
        value: -45.67,
        categories: [{ code: 'alimentaire', parent_code: 'vie_quotidienne' }],
        card: '****1234',
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'VIREMENT DE M. MARTIN SALAIRE',
        simplified_wording: 'Virement salaire',
        wording: 'Salaire février',
        value: 2500.0,
        categories: [{ code: 'salaire', parent_code: 'revenus' }],
        card: null,
      },
      {
        type: TransactionType.CARD,
        original_wording: 'SHELL STATION SERVICE',
        simplified_wording: 'Shell',
        wording: 'Carburant',
        value: -65.3,
        categories: [{ code: 'transport', parent_code: 'vie_quotidienne' }],
        card: '****5678',
      },
      {
        type: TransactionType.CHECK,
        original_wording: 'CHEQUE N°1234567',
        simplified_wording: 'Chèque',
        wording: 'Loyer appartement',
        value: -850.0,
        categories: [{ code: 'logement', parent_code: 'vie_quotidienne' }],
        card: null,
      },
      {
        type: TransactionType.WITHDRAWAL,
        original_wording: 'RETRAIT DAB BNP PARIBAS',
        simplified_wording: 'Retrait DAB',
        wording: 'Retrait espèces',
        value: -100.0,
        categories: [{ code: 'liquide', parent_code: 'vie_quotidienne' }],
        card: '****1234',
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'VIREMENT REMBOURSEMENT CAF',
        simplified_wording: 'CAF',
        wording: 'Allocation familiale',
        value: 320.5,
        categories: [{ code: 'aide_sociale', parent_code: 'revenus' }],
        card: null,
      },
      // Business-specific transactions
      {
        type: TransactionType.TRANSFER,
        original_wording: 'VIREMENT CLIENT ABC COMPANY',
        simplified_wording: 'ABC Company',
        wording: 'Paiement facture #2025-001',
        value: 1250.0,
        categories: [{ code: 'revenus_entreprise', parent_code: 'revenus' }],
        card: null,
      },
      {
        type: TransactionType.CARD,
        original_wording: 'AMAZON BUSINESS FR',
        simplified_wording: 'Amazon Business',
        wording: 'Fournitures bureau',
        value: -89.99,
        categories: [{ code: 'fournitures', parent_code: 'entreprise' }],
        card: '****9876',
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'PRELEVEMENT URSSAF',
        simplified_wording: 'URSSAF',
        wording: 'Cotisations sociales',
        value: -456.78,
        categories: [{ code: 'charges_sociales', parent_code: 'entreprise' }],
        card: null,
      },
      // Investment-related transactions
      {
        type: TransactionType.TRANSFER,
        original_wording: 'VIREMENT VERS COMPTE TITRES',
        simplified_wording: 'Versement investissement',
        wording: 'Apport compte titres',
        value: -1000.0,
        categories: [{ code: 'investissement', parent_code: 'epargne' }],
        card: null,
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'DIVIDENDE ACTIONS TOTAL',
        simplified_wording: 'Dividende Total',
        wording: 'Dividende actions',
        value: 125.5,
        categories: [{ code: 'dividendes', parent_code: 'revenus' }],
        card: null,
      },
      {
        type: TransactionType.FEE,
        original_wording: 'FRAIS COURTAGE BOURSE',
        simplified_wording: 'Frais courtage',
        wording: 'Commission transaction',
        value: -9.9,
        categories: [{ code: 'frais_bancaires', parent_code: 'frais' }],
        card: null,
      },
      // Credit card specific
      {
        type: TransactionType.CARD,
        original_wording: 'FNAC PARIS CHATELET',
        simplified_wording: 'Fnac',
        wording: 'Achat électronique',
        value: -299.99,
        categories: [{ code: 'loisirs', parent_code: 'vie_quotidienne' }],
        card: '****2468',
      },
      {
        type: TransactionType.CARD,
        original_wording: 'RESTAURANT LE PETIT PARIS',
        simplified_wording: 'Restaurant',
        wording: 'Déjeuner professionnel',
        value: -89.5,
        categories: [{ code: 'restaurants', parent_code: 'vie_quotidienne' }],
        card: '****3579',
      },
      // Loan payments
      {
        type: TransactionType.TRANSFER,
        original_wording: 'PAIEMENT PRET IMMOBILIER',
        simplified_wording: 'Paiement prêt',
        wording: 'Mensualité prêt immobilier',
        value: -800.0,
        categories: [{ code: 'pret_immo', parent_code: 'logement' }],
        card: null,
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'PAIEMENT PRET AUTO',
        simplified_wording: 'Paiement prêt auto',
        wording: 'Mensualité véhicule',
        value: -420.0,
        categories: [{ code: 'pret_auto', parent_code: 'transport' }],
        card: null,
      },
      // High-yield savings specific
      {
        type: TransactionType.TRANSFER,
        original_wording: 'INTERETS CREDITEURS',
        simplified_wording: 'Intérêts',
        wording: 'Intérêts livret épargne',
        value: 25.3,
        categories: [{ code: 'interets', parent_code: 'revenus' }],
        card: null,
      },
      {
        type: TransactionType.TRANSFER,
        original_wording: 'VIREMENT EPARGNE AUTOMATIQUE',
        simplified_wording: 'Épargne automatique',
        wording: 'Versement programmé',
        value: 500.0,
        categories: [{ code: 'epargne', parent_code: 'epargne' }],
        card: null,
      },
      // Line of credit transactions
      {
        type: TransactionType.TRANSFER,
        original_wording: 'UTILISATION LIGNE CREDIT',
        simplified_wording: 'Utilisation crédit',
        wording: 'Tirage ligne de crédit',
        value: -2000.0,
        categories: [{ code: 'credit', parent_code: 'financement' }],
        card: null,
      },
      {
        type: TransactionType.FEE,
        original_wording: 'INTERET LIGNE CREDIT',
        simplified_wording: 'Intérêts crédit',
        wording: 'Intérêts ligne de crédit',
        value: -18.75,
        categories: [{ code: 'interets_debiteurs', parent_code: 'frais' }],
        card: null,
      },
    ];

    // Generate transactions for the specific account
    const mockTransactions: Transaction[] = [];
    const numTransactions = Math.min(10, filters.limit || 20);

    for (let i = 0; i < numTransactions; i++) {
      const templateIndex = (seed + i) % mockTransactionTemplates.length;
      const template = mockTransactionTemplates[templateIndex];
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - i - 1); // Each transaction 1 day earlier

      mockTransactions.push({
        id: accountId * 1000 + i + 1, // Unique ID based on account
        id_account: accountId,
        application_date: transactionDate.toISOString().split('T')[0],
        date: transactionDate.toISOString().split('T')[0],
        datetime: transactionDate.toISOString(),
        vdate: transactionDate.toISOString().split('T')[0],
        vdatetime: transactionDate.toISOString(),
        rdate: transactionDate.toISOString().split('T')[0],
        rdatetime: transactionDate.toISOString(),
        bdate: null,
        bdatetime: null,
        value: template.value,
        gross_value: template.value,
        type: template.type,
        original_wording: template.original_wording,
        simplified_wording: template.simplified_wording,
        wording: template.wording,
        categories: template.categories,
        date_scraped: new Date().toISOString(),
        coming: false,
        active: true,
        id_cluster: null,
        comment: null,
        last_update: new Date().toISOString(),
        deleted: null,
        original_value: template.value,
        original_gross_value: template.value,
        original_currency: {
          id: 'EUR',
          symbol: '€',
          prefix: false,
          crypto: false,
          precision: 2,
          marketcap: null,
          datetime: null,
          name: 'Euro',
        },
        commission: null,
        commission_currency: null,
        country: null,
        card: template.card,
        counterparty: {
          label: template.simplified_wording.toUpperCase(),
          account_scheme_name: null,
          account_identification: null,
          type: template.value > 0 ? 'debtor' : 'creditor',
        },
      });
    }

    // Apply filters
    let filteredTransactions = mockTransactions;

    if (filters.minValue !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => (t.value || 0) >= filters.minValue!);
    }

    if (filters.maxValue !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => (t.value || 0) <= filters.maxValue!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(
        t =>
          t.original_wording.toLowerCase().includes(searchLower) ||
          (t.wording && t.wording.toLowerCase().includes(searchLower)) ||
          t.simplified_wording.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const limit = filters.limit || 30;
    const offset = filters.offset || 0;
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    return {
      transactions: paginatedTransactions,
      first_date: '2024-12-01',
      last_date: '2025-02-07',
      result_min_date: filters.minDate || '2025-01-01',
      result_max_date: filters.maxDate || '2025-02-07',
      _links: {
        current: `mock://transactions?limit=${limit}&offset=${offset}`,
        next:
          offset + limit < filteredTransactions.length
            ? `mock://transactions?limit=${limit}&offset=${offset + limit}`
            : undefined,
        previous:
          offset > 0
            ? `mock://transactions?limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : undefined,
      },
    };
  }
}
