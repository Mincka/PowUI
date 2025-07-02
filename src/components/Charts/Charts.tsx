import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Chart as ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import {
  Account,
  AccountsByType,
  AccountsByBank,
  Connection,
  Connector,
} from '../../types/accounts';
import { getAccountsByTypeChartData, getBanksByBalanceChartData } from '../../utils/accountUtils';
import styles from './Charts.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

interface ChartsProps {
  accounts: Account[];
  accountsByType: AccountsByType;
  accountsByBank: AccountsByBank;
  connections: Connection[];
  connectorMap: Map<number, Connector>;
}

export const Charts: React.FC<ChartsProps> = ({
  accountsByType,
  accountsByBank,
  connections,
  connectorMap,
}) => {
  const { t } = useTranslation('financial');
  const accountTypeChartData = getAccountsByTypeChartData(accountsByType);
  const banksByBalanceChartData = getBanksByBalanceChartData(
    accountsByBank,
    connections,
    connectorMap
  );

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: {
            parsed: number;
            label: string;
            dataset: { data: number[] };
          }) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(value)} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        formatter: (value: number, context: { chart: ChartType; datasetIndex: number }) => {
          const dataset = context.chart.data.datasets[context.datasetIndex];
          const total = (dataset.data as number[]).reduce((acc, curr) => acc + curr, 0);
          const percentage = (value / total) * 100;
          if (percentage < 5) {
            return '';
          }
          return `${new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            notation: 'compact',
          }).format(value)}`;
        },
        color: '#fff',
        textStrokeColor: 'black',
        textStrokeWidth: 2,
      },
    },
  };

  return (
    <div className={styles.chartsSection}>
      <div className={styles.chartContainer}>
        <h3>{t('account_type_distribution')}</h3>
        <div className={styles.chartWrapper}>
          <Doughnut data={accountTypeChartData} options={doughnutOptions} />
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h3>{t('assets_by_bank')}</h3>
        <div className={styles.chartWrapper}>
          <Doughnut data={banksByBalanceChartData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
};
