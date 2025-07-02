import {
  RealEstateAsset,
  MortgageLiability,
  RealEstateSummary,
  PropertyFormData,
  MortgageFormData,
} from '../types/realEstate';

const STORAGE_KEYS = {
  PROPERTIES: 'real_estate_properties',
  MORTGAGES: 'real_estate_mortgages',
};

class RealEstateService {
  // Properties CRUD operations
  getProperties(): RealEstateAsset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading properties:', error);
      return [];
    }
  }

  saveProperties(properties: RealEstateAsset[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
    } catch (error) {
      console.error('Error saving properties:', error);
    }
  }

  addProperty(propertyData: PropertyFormData): RealEstateAsset {
    const newProperty: RealEstateAsset = {
      id: this.generateId(),
      ...propertyData,
      last_valuation_date: new Date().toISOString().split('T')[0],
    };

    const properties = this.getProperties();
    properties.push(newProperty);
    this.saveProperties(properties);
    return newProperty;
  }

  updateProperty(id: string, propertyData: Partial<PropertyFormData>): RealEstateAsset | null {
    const properties = this.getProperties();
    const index = properties.findIndex(p => p.id === id);

    if (index === -1) return null;

    properties[index] = {
      ...properties[index],
      ...propertyData,
      last_valuation_date: new Date().toISOString().split('T')[0],
    };

    this.saveProperties(properties);
    return properties[index];
  }

  deleteProperty(id: string): boolean {
    const properties = this.getProperties();
    const mortgages = this.getMortgages();

    // Remove property
    const filteredProperties = properties.filter(p => p.id !== id);
    // Remove associated mortgages
    const filteredMortgages = mortgages.filter(m => m.property_id !== id);

    this.saveProperties(filteredProperties);
    this.saveMortgages(filteredMortgages);

    return filteredProperties.length < properties.length;
  }

  // Mortgages CRUD operations
  getMortgages(): MortgageLiability[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MORTGAGES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading mortgages:', error);
      return [];
    }
  }

  saveMortgages(mortgages: MortgageLiability[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MORTGAGES, JSON.stringify(mortgages));
    } catch (error) {
      console.error('Error saving mortgages:', error);
    }
  }

  addMortgage(mortgageData: MortgageFormData): MortgageLiability {
    const newMortgage: MortgageLiability = {
      id: this.generateId(),
      ...mortgageData,
    };

    const mortgages = this.getMortgages();
    mortgages.push(newMortgage);
    this.saveMortgages(mortgages);
    return newMortgage;
  }

  updateMortgage(id: string, mortgageData: Partial<MortgageFormData>): MortgageLiability | null {
    const mortgages = this.getMortgages();
    const index = mortgages.findIndex(m => m.id === id);

    if (index === -1) return null;

    mortgages[index] = {
      ...mortgages[index],
      ...mortgageData,
    };

    this.saveMortgages(mortgages);
    return mortgages[index];
  }

  deleteMortgage(id: string): boolean {
    const mortgages = this.getMortgages();
    const filtered = mortgages.filter(m => m.id !== id);
    this.saveMortgages(filtered);
    return filtered.length < mortgages.length;
  }

  // Summary calculations
  getRealEstateSummary(): RealEstateSummary {
    const properties = this.getProperties();
    const mortgages = this.getMortgages();

    const totalPropertyValue = properties.reduce((sum, property) => {
      const ownershipShare = property.ownership_percentage / 100;
      return sum + property.market_value * ownershipShare;
    }, 0);

    const totalMortgageBalance = mortgages.reduce((sum, mortgage) => {
      const ownershipShare = mortgage.ownership_percentage / 100;
      return sum + mortgage.remaining_balance * ownershipShare;
    }, 0);

    const totalEquity = totalPropertyValue - totalMortgageBalance;

    return {
      totalPropertyValue,
      totalMortgageBalance,
      totalEquity,
      properties,
      mortgages,
    };
  }

  // Get property type display name
  getPropertyTypeDisplayName(type: RealEstateAsset['property_type']): string {
    const typeMap: Record<RealEstateAsset['property_type'], string> = {
      house: 'Maison',
      apartment: 'Appartement',
      land: 'Terrain',
      commercial: 'Commercial',
    };
    return typeMap[type] || type;
  }

  // Utility methods
  private generateId(): string {
    return `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get mortgages for a specific property
  getMortgagesForProperty(propertyId: string): MortgageLiability[] {
    return this.getMortgages().filter(m => m.property_id === propertyId);
  }

  // Clear all data (for testing/reset)
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PROPERTIES);
    localStorage.removeItem(STORAGE_KEYS.MORTGAGES);
  }
}

export const realEstateService = new RealEstateService();
export default realEstateService;
