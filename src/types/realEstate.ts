export interface RealEstateAsset {
  id: string;
  name: string;
  property_type: 'house' | 'apartment' | 'land' | 'commercial';
  market_value: number;
  ownership_percentage: number; // 0-100
  purchase_date: string;
  purchase_price?: number;
  last_valuation_date: string;
  address?: string;
  description?: string;
}

export interface MortgageLiability {
  id: string;
  property_id: string; // Links to RealEstateAsset
  name: string;
  original_amount: number;
  remaining_balance: number;
  monthly_payment: number;
  interest_rate: number;
  ownership_percentage: number; // 0-100 (your share of the mortgage)
  start_date: string;
  end_date: string;
  bank_name?: string;
}

export interface RealEstateSummary {
  totalPropertyValue: number;
  totalMortgageBalance: number;
  totalEquity: number;
  properties: RealEstateAsset[];
  mortgages: MortgageLiability[];
}

export interface CompleteFinancialSummary {
  // From existing API accounts
  accounts: import('./accounts').Account[];
  totalAccountsBalance: number;
  totalAccountAssets: number;
  totalAccountLiabilities: number;

  // Real estate data
  realEstate: RealEstateSummary;

  // Combined totals (actif/passif)
  totalAssets: number; // accounts + real estate equity
  totalLiabilities: number; // account debts + mortgages
  netWorth: number; // total assets - total liabilities
}

export interface PropertyFormData {
  name: string;
  property_type: RealEstateAsset['property_type'];
  market_value: number;
  ownership_percentage: number;
  purchase_date: string;
  purchase_price?: number;
  address?: string;
  description?: string;
}

export interface MortgageFormData {
  property_id: string;
  name: string;
  original_amount: number;
  remaining_balance: number;
  monthly_payment: number;
  interest_rate: number;
  ownership_percentage: number;
  start_date: string;
  end_date: string;
  bank_name?: string;
}
