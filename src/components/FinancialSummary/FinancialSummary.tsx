import React from 'react';
import { useTranslation } from 'react-i18next';
import { CompleteFinancialSummary } from '../../types/realEstate';
import { formatCurrency, getActifPassifBreakdown } from '../../utils/accountUtils';
import styles from './FinancialSummary.module.css';

interface FinancialSummaryProps {
  summary: CompleteFinancialSummary;
  ignoreApiDebts: boolean;
  onToggleIgnoreApiDebts: (value: boolean) => void;
  showRealEstateForm: boolean;
  onToggleRealEstateForm: () => void;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  summary,
  ignoreApiDebts,
  onToggleIgnoreApiDebts,
  showRealEstateForm,
  onToggleRealEstateForm,
}) => {
  const { t } = useTranslation(['financial', 'forms', 'common']);
  const breakdown = getActifPassifBreakdown(summary);

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) {
      return '0.0';
    }
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('financial_summary_title')}</h2>
        <div className={styles.controlsContainer}>
          <label className={styles.debtToggle}>
            <input
              type="checkbox"
              checked={ignoreApiDebts}
              onChange={e => onToggleIgnoreApiDebts(e.target.checked)}
            />
            <span>{t('forms:ignore_api_debts')}</span>
          </label>
          <button onClick={onToggleRealEstateForm} className={styles.managementButton}>
            {showRealEstateForm ? t('common:hide') : t('common:show')} {t('forms:real_estate_form')}
          </button>
        </div>
      </div>
      <div className={styles.mainSummaryLayout}>
        <div className={styles.summaryGrid}>
          {/* ACTIF Section */}
          <div className={styles.actifSection}>
            <h3 className={`${styles.sectionTitle} ${styles.actifTitle}`}>{t('assets_section')}</h3>

            <div className={`${styles.summaryCard} ${styles.actifCard}`}>
              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('financial_accounts')}</span>
                <div className={styles.valueContainer}>
                  <span className={`${styles.value} ${styles.positive}`}>
                    {formatCurrency(breakdown.actif.comptes_financiers)}
                  </span>
                  <span className={styles.percentage}>
                    {calculatePercentage(breakdown.actif.comptes_financiers, breakdown.actif.total)}
                    %
                  </span>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('real_estate_share')}</span>
                <div className={styles.valueContainer}>
                  <span className={`${styles.value} ${styles.positive}`}>
                    {formatCurrency(breakdown.actif.immobilier)}
                  </span>
                  <span className={styles.percentage}>
                    {calculatePercentage(breakdown.actif.immobilier, breakdown.actif.total)}%
                  </span>
                </div>
              </div>

              <div className={`${styles.summaryItem} ${styles.totalRow}`}>
                <span className={styles.label}>{t('total_assets')}</span>
                <span className={`${styles.value} ${styles.totalActif}`}>
                  {formatCurrency(breakdown.actif.total)}
                </span>
              </div>
            </div>
          </div>

          {/* PASSIF Section */}
          <div className={styles.passifSection}>
            <h3 className={`${styles.sectionTitle} ${styles.passifTitle}`}>
              {t('liabilities_section')}
            </h3>

            <div className={`${styles.summaryCard} ${styles.passifCard}`}>
              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('account_debts')}</span>
                <div className={styles.valueContainer}>
                  <span className={`${styles.value} ${styles.negative}`}>
                    {formatCurrency(breakdown.passif.dettes_comptes)}
                  </span>
                  <span className={styles.percentage}>
                    {calculatePercentage(breakdown.passif.dettes_comptes, breakdown.passif.total)}%
                  </span>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('mortgage_credits_share')}</span>
                <div className={styles.valueContainer}>
                  <span className={`${styles.value} ${styles.negative}`}>
                    {formatCurrency(breakdown.passif.credits_immobiliers)}
                  </span>
                  <span className={styles.percentage}>
                    {calculatePercentage(
                      breakdown.passif.credits_immobiliers,
                      breakdown.passif.total
                    )}
                    %
                  </span>
                </div>
              </div>

              <div className={`${styles.summaryItem} ${styles.totalRow}`}>
                <span className={styles.label}>{t('total_liabilities')}</span>
                <span className={`${styles.value} ${styles.totalPassif}`}>
                  {formatCurrency(breakdown.passif.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Worth Section */}
        <div className={styles.netWorthSection}>
          <h3 className={styles.netWorthTitle}>{t('net_worth')}</h3>
          <div className={styles.netWorthCalculation}>
            <span
              className={`${styles.netWorthValue} ${
                breakdown.patrimoine_net >= 0 ? styles.positive : styles.negative
              }`}
            >
              {formatCurrency(breakdown.patrimoine_net)}
            </span>
          </div>
        </div>
      </div>

      {/* Real Estate Summary */}
      {summary.realEstate.properties.length > 0 && (
        <div className={styles.realEstateSummary}>
          <h3>{t('real_estate_summary')}</h3>
          <div className={styles.realEstateGrid}>
            {summary.realEstate.properties.map(property => {
              const propertyMortgages = summary.realEstate.mortgages.filter(
                m => m.property_id === property.id
              );
              const propertyValue = (property.market_value * property.ownership_percentage) / 100;
              const propertyDebt = propertyMortgages.reduce(
                (sum, m) => sum + (m.remaining_balance * m.ownership_percentage) / 100,
                0
              );
              const propertyEquity = propertyValue - propertyDebt;

              return (
                <div key={property.id} className={styles.propertyCard}>
                  <h4>{property.name}</h4>
                  <div className={styles.propertyDetails}>
                    <div className={styles.propertyItem}>
                      <span>{t('property_value_share')}</span>
                      <span className={styles.positive}>{formatCurrency(propertyValue)}</span>
                    </div>
                    {propertyDebt > 0 && (
                      <div className={styles.propertyItem}>
                        <span>{t('remaining_credit')}</span>
                        <span className={styles.negative}>{formatCurrency(propertyDebt)}</span>
                      </div>
                    )}
                    <div className={`${styles.propertyItem} ${styles.equityRow}`}>
                      <span>{t('net_equity')}</span>
                      <span className={propertyEquity >= 0 ? styles.positive : styles.negative}>
                        {formatCurrency(propertyEquity)}
                      </span>
                    </div>
                    <div className={styles.propertyMeta}>
                      <small>
                        {t('ownership_percentage', { percentage: property.ownership_percentage })} •
                        {t('property_type', { type: property.property_type })}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialSummary;
