import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChartType } from '../../../types/accountHistory';
import styles from './ChartTypeSelector.module.css';

interface ChartTypeSelectorProps {
  selectedType: ChartType;
  onTypeChange: (type: ChartType) => void;
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  const { t } = useTranslation('financial');

  const chartTypes: { value: ChartType; label: string; description: string }[] = [
    {
      value: 'multiColumn',
      label: t('multi_column_chart'),
      description: t('multi_column_chart_description'),
    },
    {
      value: 'stacked',
      label: t('stacked_chart'),
      description: t('stacked_chart_description'),
    },
    {
      value: 'area',
      label: t('area_chart'),
      description: t('area_chart_description'),
    },
    {
      value: 'line',
      label: t('line_chart'),
      description: t('line_chart_description'),
    },
  ];

  return (
    <div className={styles.selector}>
      <h4 className={styles.title}>{t('chart_type')}</h4>
      <div className={styles.options}>
        {chartTypes.map(({ value, label, description }) => (
          <label key={value} className={styles.option}>
            <input
              type="radio"
              name="chartType"
              value={value}
              checked={selectedType === value}
              onChange={() => onTypeChange(value)}
              className={styles.radio}
            />
            <div className={styles.optionContent}>
              <div className={styles.optionLabel}>{label}</div>
              <div className={styles.optionDescription}>{description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
