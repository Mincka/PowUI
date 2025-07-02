import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../types/accounts';
import { formatCurrency, getInvestmentPerformanceData } from '../../utils/accountUtils';
import styles from './InvestmentPerformance.module.css';

interface InvestmentPerformanceProps {
  investmentAccounts: Account[];
}

export const InvestmentPerformance: React.FC<InvestmentPerformanceProps> = ({
  investmentAccounts,
}) => {
  const { t } = useTranslation('financial');
  const investmentData = getInvestmentPerformanceData(investmentAccounts);

  if (investmentData.length === 0) {
    return null;
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getPerformanceClass = (value: number) => {
    return value >= 0 ? styles.positive : styles.negative;
  };

  return (
    <div className={styles.investmentSection}>
      <h3>{t('investment_performance')}</h3>
      <div className={styles.investmentCards}>
        {investmentData.map((investment, index) => (
          <div key={index} className={styles.investmentCard}>
            <h4>{investment.name}</h4>
            <div className={styles.investmentType}>{investment.type}</div>

            <div className={styles.investmentMetrics}>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>{t('balance')}</div>
                <div className={styles.metricValue}>{formatCurrency(investment.balance)}</div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>{t('valuation')}</div>
                <div className={styles.metricValue}>{formatCurrency(investment.valuation)}</div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>{t('capital_gain')}</div>
                <div className={`${styles.metricValue} ${getPerformanceClass(investment.diff)}`}>
                  {formatCurrency(investment.diff)}
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>{t('performance')}</div>
                <div
                  className={`${styles.metricValue} ${getPerformanceClass(investment.diffPercent)}`}
                >
                  {formatPercentage(investment.diffPercent)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
