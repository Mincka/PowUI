import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line } from 'react-chartjs-2';
import { Account, Connector } from '../../types/accounts';
import { AccountHistoryEntry, ChartType } from '../../types/accountHistory';
import { organizeAccountsByBankWithConnectors } from '../../utils/accountUtils';
import { ConnectorService } from '../../services/connectorService';
import { AccountsService } from '../../services/accountsService';
import { useAppData } from '../../contexts/AppDataContext';
import styles from './AccountHistoryCharts.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartDataLabels
);

interface AccountHistoryChartsProps {
  history: AccountHistoryEntry[];
  accounts: Account[];
  chartType: ChartType;
}

// Color palette for accounts
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280', // gray
];

// Helper function to check if a color is dark
const isColorDark = (color: string): boolean => {
  // Convert color to RGB
  let r: number, g: number, b: number;
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (!matches || matches.length < 3) return false;
    r = parseInt(matches[0]);
    g = parseInt(matches[1]);
    b = parseInt(matches[2]);
  } else if (color.startsWith('hsl')) {
    // For HSL, check if lightness is < 50%
    const matches = color.match(/\d+/g);
    if (!matches || matches.length < 3) return false;
    const lightness = parseInt(matches[2]);
    return lightness < 50;
  } else {
    return false; // Unknown format, assume light
  }
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

export const AccountHistoryCharts: React.FC<AccountHistoryChartsProps> = ({
  history,
  accounts,
  chartType,
}) => {
  const { t } = useTranslation('financial');
  const { connections } = useAppData();
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());
  
  // Load connectors for bank names
  useEffect(() => {
    const loadConnectors = async () => {
      if (accounts.length === 0 || connections.length === 0) return;

      try {
        const config = AccountsService.getConfig();
        const connectionIds = [...new Set(accounts.map(acc => acc.id_connection).filter(Boolean))];
        if (connectionIds.length === 0) return;

        const connectorIds = [
          ...new Set(
            connections
              .filter(conn => connectionIds.includes(conn.id))
              .map(conn => conn.id_connector)
              .filter(Boolean)
          ),
        ];

        if (connectorIds.length > 0) {
          const connectors = await ConnectorService.getConnectorsWithCache(connectorIds, config);
          setConnectorMap(connectors);
        }
      } catch (error) {
        console.error('Failed to load connectors:', error);
      }
    };

    loadConnectors();
  }, [accounts.length, connections.length]);

  const chartData = useMemo(() => {
    // Get bank info for accounts
    const accountsByBank = organizeAccountsByBankWithConnectors(accounts, connections, connectorMap);
    
    // Group history by date
    const groupedByDate = history.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = {};
      }
      acc[entry.date][entry.accountId] = entry.balance;
      return acc;
    }, {} as Record<string, Record<number, number>>);

    // Get sorted dates
    const dates = Object.keys(groupedByDate).sort();
    
    // Helper function to get connector color for an account
    const getAccountColor = (account: Account): string => {
      if (account.id_connection) {
        const connection = connections.find(conn => conn.id === account.id_connection);
        if (connection?.id_connector) {
          const connectorInfo = ConnectorService.getConnectorInfo(connection.id_connector, connectorMap);
          return connectorInfo.color;
        }
      }
      // Fallback color
      const hue = (account.id * 137.508) % 360;
      return `hsl(${Math.floor(hue)}, 65%, 50%)`;
    };
    
    // Calculate average balance for each account to sort by
    const accountsWithAverage = accounts.map(account => {
      const data = dates.map(date => groupedByDate[date][account.id] || 0);
      const averageBalance = data.reduce((sum, val) => sum + val, 0) / data.length;
      const latestBalance = data[data.length - 1] || 0;
      
      // Find bank name for this account
      let bankName = 'Unknown Bank';
      for (const [bank, bankInfo] of Object.entries(accountsByBank)) {
        if (bankInfo.accounts.some(acc => acc.id === account.id)) {
          bankName = bank;
          break;
        }
      }
      
      return {
        account,
        bankName,
        data,
        averageBalance,
        latestBalance,
        color: getAccountColor(account),
      };
    });

    // Sort accounts by latest balance (largest to smallest)
    accountsWithAverage.sort((a, b) => Math.abs(b.latestBalance) - Math.abs(a.latestBalance));

    // Create datasets for each account
    const datasets = accountsWithAverage.map((item, index) => {
      const { account, bankName, data, latestBalance, color } = item;
      
      // Format currency for legend - no cents, compact notation
      const formattedAmount = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: 'compact',
      }).format(latestBalance);
      
      const baseDataset = {
        label: `${bankName} - ${account.name} (${formattedAmount})`,
        data,
        backgroundColor: chartType === 'area' ? `${color}40` : color,
        borderColor: color,
        borderWidth: chartType === 'area' ? 2 : 1,
      };

      // Chart type specific configurations
      switch (chartType) {
        case 'stacked':
          return {
            ...baseDataset,
            stack: 'stack1',
          };
        case 'area':
          return {
            ...baseDataset,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          };
        case 'line':
          return {
            ...baseDataset,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          };
        default: // multiColumn
          return {
            ...baseDataset,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
          };
      }
    });

    return {
      labels: dates.map(date => 
        new Date(date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
        })
      ),
      datasets,
    };
  }, [history, accounts, chartType, connections, connectorMap]);

  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: chartType === 'area',
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              const value = context.parsed.y;
              const accountName = context.dataset.label;
              return `${accountName}: ${new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`;
            },
            footer: function (tooltipItems: any[]) {
              if (chartType === 'stacked' || chartType === 'area') {
                const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                return `Total: ${new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(total)}`;
              }
              return '';
            },
          },
        },
        datalabels: {
          display: function(context: any) {
            // Only show labels for significant values to avoid clutter
            return context.dataset.data[context.dataIndex] > 1000;
          },
          color: function(context: any) {
            // Only use dynamic color for stacked charts (where labels are inside bars)
            if (chartType === 'stacked') {
              const bgColor = context.dataset.backgroundColor;
              if (typeof bgColor === 'string') {
                // Check if it's a dark color to use white text, otherwise use dark text
                return isColorDark(bgColor) ? '#ffffff' : '#374151';
              }
            }
            return '#374151'; // Default to dark text for all other chart types
          },
          font: {
            weight: 'bold' as const,
            size: 11,
          },
          formatter: function(value: any) {
            return new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
              notation: 'compact',
            }).format(value);
          },
          anchor: chartType === 'stacked' ? 'center' as const : 'end' as const,
          align: chartType === 'stacked' ? 'center' as const : 'top' as const,
          offset: chartType === 'stacked' ? 0 : 4,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('date'),
            color: '#374151',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
          ticks: {
            color: '#374151',
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: t('balance'),
            color: '#374151',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
          ticks: {
            color: '#374151',
            callback: function (value: any) {
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                notation: 'compact',
              }).format(value);
            },
          },
        },
      },
    };

    // Chart type specific configurations
    switch (chartType) {
      case 'stacked':
        return {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            x: {
              ...baseOptions.scales.x,
              stacked: true,
            },
            y: {
              ...baseOptions.scales.y,
              stacked: true,
            },
          },
        };
      case 'area':
        return {
          ...baseOptions,
          elements: {
            line: {
              tension: 0.3,
            },
            point: {
              radius: 4,
              hoverRadius: 6,
            },
          },
        };
      default: // multiColumn
        return baseOptions;
    }
  }, [chartType, t]);

  if (history.length === 0) {
    return (
      <div className={styles.noData}>
        <p>{t('no_data_to_chart')}</p>
      </div>
    );
  }

  const ChartComponent = (chartType === 'area' || chartType === 'line') ? Line : Bar;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartWrapper}>
        <ChartComponent 
          key={`chart-${chartType}`} 
          data={chartData} 
          options={chartOptions} 
        />
      </div>
    </div>
  );
};
