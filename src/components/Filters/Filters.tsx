import React from 'react';
import { useTranslation } from 'react-i18next';
import { getAccountTypeDisplayName } from '../../utils/accountUtils';
import styles from './Filters.module.css';

export interface FilterState {
  accountType: string;
  minBalance: string;
  maxBalance: string;
  searchTerm: string;
}

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  accountTypes: string[];
}

export const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, accountTypes }) => {
  const { t } = useTranslation('dashboard');

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className={styles.filters}>
      <h3>{t('filters')}</h3>
      <div className={styles.filterControls}>
        <div className={styles.filterGroup}>
          <label htmlFor="account-type">{t('account_type')}</label>
          <select
            id="account-type"
            value={filters.accountType}
            onChange={e => handleFilterChange('accountType', e.target.value)}
          >
            <option value="">{t('all_types')}</option>
            {accountTypes.map(type => (
              <option key={type} value={type}>
                {getAccountTypeDisplayName(type)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="search-term">{t('search')}</label>
          <input
            id="search-term"
            type="text"
            placeholder={t('account_name_placeholder')}
            value={filters.searchTerm}
            onChange={e => handleFilterChange('searchTerm', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="min-balance">{t('min_balance')}</label>
          <input
            id="min-balance"
            type="number"
            placeholder="0"
            value={filters.minBalance}
            onChange={e => handleFilterChange('minBalance', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="max-balance">{t('max_balance')}</label>
          <input
            id="max-balance"
            type="number"
            placeholder={t('no_limit')}
            value={filters.maxBalance}
            onChange={e => handleFilterChange('maxBalance', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
