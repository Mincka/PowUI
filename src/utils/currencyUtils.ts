/**
 * Currency formatting utilities
 */

export const formatCurrency = (amount: number, currency: string = '€'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === '€' ? 'EUR' : currency,
  }).format(amount);
};

export const getAccountTypeDisplayName = (type: string | null | undefined): string => {
  // Handle null, undefined, or empty string cases
  if (!type) {
    return 'Type Inconnu';
  }

  const typeMap: Record<string, string> = {
    checking: 'Compte Courant',
    loan: 'Prêt',
    lifeinsurance: 'Assurance Vie',
    card: 'Carte',
    pea: "Plan d'Épargne en Actions",
    market: 'Compte Titres',
    savings: "Livret d'Épargne",
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

export const getAccountTypeColor = (type: string | null | undefined): string => {
  // Handle null, undefined, or empty string cases
  if (!type) {
    return '#757575';
  }

  const colorMap: Record<string, string> = {
    checking: '#4CAF50',
    loan: '#F44336',
    lifeinsurance: '#2196F3',
    card: '#FF9800',
    pea: '#9C27B0',
    market: '#00BCD4',
    savings: '#8BC34A',
  };
  return colorMap[type] || '#757575';
};
