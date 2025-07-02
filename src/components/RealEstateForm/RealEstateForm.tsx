import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RealEstateAsset,
  MortgageLiability,
  PropertyFormData,
  MortgageFormData,
} from '../../types/realEstate';
import realEstateService from '../../services/realEstateService';
import { formatCurrency } from '../../utils/accountUtils';
import styles from './RealEstateForm.module.css';

interface RealEstateFormProps {
  onPropertyAdded?: () => void;
  onMortgageAdded?: () => void;
  onPropertyDeleted?: () => void;
  onMortgageDeleted?: () => void;
  onClose?: () => void;
}

const RealEstateForm: React.FC<RealEstateFormProps> = ({
  onPropertyAdded,
  onMortgageAdded,
  onPropertyDeleted,
  onMortgageDeleted,
  onClose,
}) => {
  const { t } = useTranslation('realEstate');
  const [activeTab, setActiveTab] = useState<'property' | 'mortgage'>('property');
  const [properties, setProperties] = useState<RealEstateAsset[]>([]);
  const [mortgages, setMortgages] = useState<MortgageLiability[]>([]);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingMortgageId, setEditingMortgageId] = useState<string | null>(null);

  // Property form state
  const [propertyForm, setPropertyForm] = useState<PropertyFormData>({
    name: '',
    property_type: 'house',
    market_value: 0,
    ownership_percentage: 50,
    purchase_date: '',
    purchase_price: undefined,
    address: '',
    description: '',
  });

  // Mortgage form state
  const [mortgageForm, setMortgageForm] = useState<MortgageFormData>({
    property_id: '',
    name: '',
    original_amount: 0,
    remaining_balance: 0,
    monthly_payment: 0,
    interest_rate: 0,
    ownership_percentage: 50,
    start_date: '',
    end_date: '',
    bank_name: '',
  });

  useEffect(() => {
    setProperties(realEstateService.getProperties());
    setMortgages(realEstateService.getMortgages());
  }, []);

  const loadPropertyForEdit = (property: RealEstateAsset) => {
    setPropertyForm({
      name: property.name,
      property_type: property.property_type,
      market_value: property.market_value,
      ownership_percentage: property.ownership_percentage,
      purchase_date: property.purchase_date,
      purchase_price: property.purchase_price,
      address: property.address || '',
      description: property.description || '',
    });
    setEditingPropertyId(property.id);
    setActiveTab('property');
  };

  const loadMortgageForEdit = (mortgage: MortgageLiability) => {
    setMortgageForm({
      property_id: mortgage.property_id,
      name: mortgage.name,
      original_amount: mortgage.original_amount,
      remaining_balance: mortgage.remaining_balance,
      monthly_payment: mortgage.monthly_payment,
      interest_rate: mortgage.interest_rate,
      ownership_percentage: mortgage.ownership_percentage,
      start_date: mortgage.start_date,
      end_date: mortgage.end_date,
      bank_name: mortgage.bank_name || '',
    });
    setEditingMortgageId(mortgage.id);
    setActiveTab('mortgage');
  };

  const cancelEdit = () => {
    setEditingPropertyId(null);
    setEditingMortgageId(null);
    resetPropertyForm();
    resetMortgageForm();
  };

  const resetPropertyForm = () => {
    setPropertyForm({
      name: '',
      property_type: 'house',
      market_value: 0,
      ownership_percentage: 50,
      purchase_date: '',
      purchase_price: undefined,
      address: '',
      description: '',
    });
  };

  const resetMortgageForm = () => {
    setMortgageForm({
      property_id: '',
      name: '',
      original_amount: 0,
      remaining_balance: 0,
      monthly_payment: 0,
      interest_rate: 0,
      ownership_percentage: 50,
      start_date: '',
      end_date: '',
      bank_name: '',
    });
  };

  const handlePropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPropertyId) {
        // Update existing property
        const updatedProperty = realEstateService.updateProperty(editingPropertyId, propertyForm);
        if (updatedProperty) {
          setProperties(prev => prev.map(p => (p.id === editingPropertyId ? updatedProperty : p)));
          onPropertyAdded?.();
          alert(t('property_modified_success'));
        }
        setEditingPropertyId(null);
      } else {
        // Add new property
        const newProperty = realEstateService.addProperty(propertyForm);
        setProperties(prev => [...prev, newProperty]);
        onPropertyAdded?.();
        alert(t('property_added_success'));
      }

      resetPropertyForm();
    } catch (error) {
      console.error('Error saving property:', error);
      alert(t('property_save_error'));
    }
  };

  const handleMortgageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mortgageForm.property_id) {
      alert(t('select_property_required'));
      return;
    }

    try {
      if (editingMortgageId) {
        // Update existing mortgage
        const updatedMortgage = realEstateService.updateMortgage(editingMortgageId, mortgageForm);
        if (updatedMortgage) {
          setMortgages(prev => prev.map(m => (m.id === editingMortgageId ? updatedMortgage : m)));
          onMortgageAdded?.();
          alert(t('mortgage_modified_success'));
        }
        setEditingMortgageId(null);
      } else {
        // Add new mortgage
        const newMortgage = realEstateService.addMortgage(mortgageForm);
        setMortgages(prev => [...prev, newMortgage]);
        onMortgageAdded?.();
        alert(t('mortgage_added_success'));
      }

      resetMortgageForm();
    } catch (error) {
      console.error('Error saving mortgage:', error);
      alert(t('mortgage_save_error'));
    }
  };

  const handleDeleteProperty = (id: string) => {
    if (confirm(t('confirm_delete_property'))) {
      realEstateService.deleteProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id));
      setMortgages(prev => prev.filter(m => m.property_id !== id));
      onPropertyDeleted?.(); // Trigger refresh
    }
  };

  const handleDeleteMortgage = (id: string) => {
    if (confirm(t('confirm_delete_mortgage'))) {
      realEstateService.deleteMortgage(id);
      setMortgages(prev => prev.filter(m => m.id !== id));
      onMortgageDeleted?.(); // Trigger refresh
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formHeader}>
        <h2>{t('real_estate_management')}</h2>
        {onClose && (
          <button onClick={onClose} className={styles.closeBtn}>
            ×
          </button>
        )}
      </div>

      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'property' ? styles.active : ''}`}
          onClick={() => setActiveTab('property')}
        >
          {t('add_property')}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'mortgage' ? styles.active : ''}`}
          onClick={() => setActiveTab('mortgage')}
        >
          {t('add_mortgage')}
        </button>
      </div>

      {activeTab === 'property' && (
        <div>
          <form onSubmit={handlePropertySubmit} className={styles.propertyForm}>
            <h3>{editingPropertyId ? t('edit_property') : t('new_property')}</h3>

            {editingPropertyId && (
              <div className={styles.editNotice}>
                <span>✏️ {t('edit_mode')}</span>
                <button type="button" onClick={cancelEdit} className={styles.cancelEditBtn}>
                  {t('cancel')}
                </button>
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="property-name">{t('property_name')} *</label>
                <input
                  id="property-name"
                  type="text"
                  value={propertyForm.name}
                  onChange={e => setPropertyForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder={t('property_name_placeholder')}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="property-type">{t('type')} *</label>
                <select
                  id="property-type"
                  value={propertyForm.property_type}
                  onChange={e =>
                    setPropertyForm(prev => ({
                      ...prev,
                      property_type: e.target.value as PropertyFormData['property_type'],
                    }))
                  }
                  required
                >
                  <option value="house">{t('house')}</option>
                  <option value="apartment">{t('apartment')}</option>
                  <option value="land">{t('land')}</option>
                  <option value="commercial">{t('commercial')}</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="market-value">{t('current_market_value')} *</label>
                <input
                  id="market-value"
                  type="number"
                  value={propertyForm.market_value || ''}
                  onChange={e =>
                    setPropertyForm(prev => ({ ...prev, market_value: Number(e.target.value) }))
                  }
                  required
                  min="0"
                  placeholder="480000"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="ownership">{t('ownership_percentage')} *</label>
                <input
                  id="ownership"
                  type="number"
                  value={propertyForm.ownership_percentage}
                  onChange={e =>
                    setPropertyForm(prev => ({
                      ...prev,
                      ownership_percentage: Number(e.target.value),
                    }))
                  }
                  required
                  min="1"
                  max="100"
                  placeholder="50"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="purchase-date">{t('purchase_date')} *</label>
                <input
                  id="purchase-date"
                  type="date"
                  value={propertyForm.purchase_date}
                  onChange={e =>
                    setPropertyForm(prev => ({ ...prev, purchase_date: e.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="purchase-price">{t('purchase_price')}</label>
                <input
                  id="purchase-price"
                  type="number"
                  value={propertyForm.purchase_price || ''}
                  onChange={e =>
                    setPropertyForm(prev => ({
                      ...prev,
                      purchase_price: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  min="0"
                  placeholder="400000"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="address">{t('address')}</label>
              <input
                id="address"
                type="text"
                value={propertyForm.address}
                onChange={e => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder={t('address_placeholder')}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">{t('description')}</label>
              <textarea
                id="description"
                value={propertyForm.description}
                onChange={e => setPropertyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('description_placeholder')}
                rows={3}
              />
            </div>

            <button type="submit" className={styles.submitBtn}>
              {editingPropertyId ? t('edit_property_btn') : t('add_property_btn')}
            </button>
          </form>

          {/* Existing Properties List */}
          {properties.length > 0 && (
            <div className={styles.existingEntries}>
              <h3>{t('existing_properties')}</h3>
              <div className={styles.entriesList}>
                {properties.map(property => (
                  <div key={property.id} className={styles.entryCard}>
                    <div className={styles.entryInfo}>
                      <h4>{property.name}</h4>
                      <p>
                        {realEstateService.getPropertyTypeDisplayName(property.property_type)} •
                        {formatCurrency(
                          (property.market_value * property.ownership_percentage) / 100
                        )}{' '}
                        ({property.ownership_percentage}%)
                      </p>
                      {property.address && <small>{property.address}</small>}
                    </div>
                    <div className={styles.entryActions}>
                      <button
                        onClick={() => loadPropertyForEdit(property)}
                        className={styles.editBtn}
                      >
                        {t('edit_btn')}
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className={styles.deleteBtn}
                      >
                        {t('delete_btn')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mortgage' && (
        <div>
          <form onSubmit={handleMortgageSubmit} className={styles.mortgageForm}>
            <h3>{editingMortgageId ? t('edit_mortgage') : t('new_mortgage')}</h3>

            {editingMortgageId && (
              <div className={styles.editNotice}>
                <span>✏️ {t('edit_mode')}</span>
                <button type="button" onClick={cancelEdit} className={styles.cancelEditBtn}>
                  {t('cancel')}
                </button>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="property-select">{t('associated_property')} *</label>
              <select
                id="property-select"
                value={mortgageForm.property_id}
                onChange={e => setMortgageForm(prev => ({ ...prev, property_id: e.target.value }))}
                required
              >
                <option value="">{t('select_property')}</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} (
                    {realEstateService.getPropertyTypeDisplayName(property.property_type)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="mortgage-name">{t('mortgage_name')} *</label>
              <input
                id="mortgage-name"
                type="text"
                value={mortgageForm.name}
                onChange={e => setMortgageForm(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder={t('mortgage_name_placeholder')}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="original-amount">{t('original_amount')} *</label>
                <input
                  id="original-amount"
                  type="number"
                  value={mortgageForm.original_amount || ''}
                  onChange={e =>
                    setMortgageForm(prev => ({ ...prev, original_amount: Number(e.target.value) }))
                  }
                  required
                  min="0"
                  placeholder="320000"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="remaining-balance">{t('remaining_balance')} *</label>
                <input
                  id="remaining-balance"
                  type="number"
                  value={mortgageForm.remaining_balance || ''}
                  onChange={e =>
                    setMortgageForm(prev => ({
                      ...prev,
                      remaining_balance: Number(e.target.value),
                    }))
                  }
                  required
                  min="0"
                  placeholder="250000"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="monthly-payment">{t('monthly_payment')} *</label>
                <input
                  id="monthly-payment"
                  type="number"
                  value={mortgageForm.monthly_payment || ''}
                  onChange={e =>
                    setMortgageForm(prev => ({ ...prev, monthly_payment: Number(e.target.value) }))
                  }
                  required
                  min="0"
                  placeholder="1200"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="interest-rate">{t('interest_rate')} *</label>
                <input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  value={mortgageForm.interest_rate || ''}
                  onChange={e =>
                    setMortgageForm(prev => ({ ...prev, interest_rate: Number(e.target.value) }))
                  }
                  required
                  min="0"
                  max="20"
                  placeholder="2.5"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="mortgage-ownership">{t('mortgage_ownership')} *</label>
                <input
                  id="mortgage-ownership"
                  type="number"
                  value={mortgageForm.ownership_percentage}
                  onChange={e =>
                    setMortgageForm(prev => ({
                      ...prev,
                      ownership_percentage: Number(e.target.value),
                    }))
                  }
                  required
                  min="1"
                  max="100"
                  placeholder="50"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bank-name">{t('bank')}</label>
                <input
                  id="bank-name"
                  type="text"
                  value={mortgageForm.bank_name}
                  onChange={e => setMortgageForm(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder={t('bank_placeholder')}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="start-date">{t('start_date')} *</label>
                <input
                  id="start-date"
                  type="date"
                  value={mortgageForm.start_date}
                  onChange={e => setMortgageForm(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="end-date">{t('end_date')} *</label>
                <input
                  id="end-date"
                  type="date"
                  value={mortgageForm.end_date}
                  onChange={e => setMortgageForm(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              {editingMortgageId ? t('edit_mortgage_btn') : t('add_mortgage_btn')}
            </button>
          </form>

          {/* Existing Mortgages List */}
          {mortgages.length > 0 && (
            <div className={styles.existingEntries}>
              <h3>{t('existing_mortgages')}</h3>
              <div className={styles.entriesList}>
                {mortgages.map(mortgage => {
                  const property = properties.find(p => p.id === mortgage.property_id);
                  const yourShare =
                    (mortgage.remaining_balance * mortgage.ownership_percentage) / 100;
                  return (
                    <div key={mortgage.id} className={styles.entryCard}>
                      <div className={styles.entryInfo}>
                        <h4>{mortgage.name}</h4>
                        <p>
                          {property?.name} •{formatCurrency(yourShare)} (
                          {mortgage.ownership_percentage}% de{' '}
                          {formatCurrency(mortgage.remaining_balance)})
                        </p>
                        <small>
                          {t('monthly_payment_display')}: {formatCurrency(mortgage.monthly_payment)}{' '}
                          •{t('rate_display')}: {mortgage.interest_rate}% •
                          {mortgage.bank_name && `${mortgage.bank_name}`}
                        </small>
                      </div>
                      <div className={styles.entryActions}>
                        <button
                          onClick={() => loadMortgageForEdit(mortgage)}
                          className={styles.editBtn}
                        >
                          {t('edit_btn')}
                        </button>
                        <button
                          onClick={() => handleDeleteMortgage(mortgage.id)}
                          className={styles.deleteBtn}
                        >
                          {t('delete_btn')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealEstateForm;
