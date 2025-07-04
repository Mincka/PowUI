import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterState } from './components/Filters';
import { Connector } from './types/accounts';
import { useAccountsData } from './hooks/useAccountsData';
import { useApiConfig } from './hooks/useApiConfig';
import { usePageTitle } from './hooks/usePageTitle';
import { ApiConfig } from './config/api';
import { analyzeAccounts, getCompleteFinancialSummary } from './utils/financialCalculations';
import { organizeAccountsByBankWithConnectors } from './utils/bankUtils';
import { Charts } from './components/Charts';
import { Filters } from './components/Filters';
import { InvestmentPerformance } from './components/InvestmentPerformance';
import { ApiConfiguration } from './components/ApiConfiguration';
import { RealEstateForm } from './components/RealEstateForm';
import { FinancialSummary } from './components/FinancialSummary';
import { BankManager } from './components/BankManager';
import { ConnectionManager } from './components/ConnectionManager';
import { NewConnectionSetup } from './components/NewConnectionSetup';
import { AccountHistory } from './components/AccountHistory';
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import { AccountsService } from './services/accountsService';
import { ConnectorService } from './services/connectorService';
import { InitialSetupWizard } from './components/InitialSetupWizard/InitialSetupWizard';
import { Footer } from './components/Footer';
import './styles/App.css';

function AppContent() {
  // Always call ALL hooks first before any early returns
  const { t } = useTranslation();
  const { apiConfig, updateConfig } = useApiConfig();
  const { data, loading, configLoading, error, refetch, handleConfigChange } = useAccountsData();
  const { connections } = useAppData();
  const [connectorMap, setConnectorMap] = useState<Map<number, Connector>>(new Map());
  const [, setIsLoadingConnectors] = useState(false);
  const [showRealEstateForm, setShowRealEstateForm] = useState(false);
  const [ignoreApiDebts, setIgnoreApiDebts] = useState(() => {
    const saved = localStorage.getItem('ignoreApiDebts');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showNewConnectionSetup, setShowNewConnectionSetup] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    accountType: '',
    minBalance: '',
    maxBalance: '',
    searchTerm: '',
  });

  // Update page title when language changes
  usePageTitle();

  useEffect(() => {
    const loadConnectors = async () => {
      if (!data || connections.length === 0) return;

      setIsLoadingConnectors(true);
      try {
        const config = AccountsService.getConfig();
        const connectionIds = [
          ...new Set(data.accounts.map(acc => acc.id_connection).filter(Boolean)),
        ];
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
      } finally {
        setIsLoadingConnectors(false);
      }
    };

    loadConnectors();
  }, [data, connections]);

  useEffect(() => {
    localStorage.setItem('ignoreApiDebts', JSON.stringify(ignoreApiDebts));
  }, [ignoreApiDebts]);

  const filteredAccounts = useMemo(() => {
    if (!data) return [];
    // Only filter, deduplication is already done in context
    return data.accounts.filter(account => {
      // Filter by account type
      if (filters.accountType && account.type !== filters.accountType) {
        return false;
      }
      // Filter by search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !account.name.toLowerCase().includes(searchLower) &&
          !account.number.toLowerCase().includes(searchLower) &&
          !(account.iban && account.iban.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }
      // Filter by balance range
      if (
        filters.minBalance !== '' &&
        filters.minBalance !== undefined &&
        account.balance < parseFloat(filters.minBalance)
      ) {
        return false;
      }
      if (
        filters.maxBalance !== '' &&
        filters.maxBalance !== undefined &&
        account.balance > parseFloat(filters.maxBalance)
      ) {
        return false;
      }
      return true;
    });
  }, [data, filters]);

  const summary = useMemo(() => {
    if (!data) return null;
    return analyzeAccounts(data);
  }, [data]);

  const completeFinancialSummary = useMemo(() => {
    if (!data) return null;
    return getCompleteFinancialSummary(data, ignoreApiDebts);
  }, [data, ignoreApiDebts]);

  const accountsByBank = useMemo(() => {
    if (!data) return {};
    let filteredAccounts = data.accounts;
    if (ignoreApiDebts) {
      filteredAccounts = filteredAccounts.filter(account => account.balance >= 0);
    }
    return organizeAccountsByBankWithConnectors(filteredAccounts, connections, connectorMap);
  }, [data, ignoreApiDebts, connections, connectorMap]);

  // Show setup wizard if no apiConfig in localStorage
  if (!localStorage.getItem('apiConfig')) {
    return (
      <InitialSetupWizard
        isVisible={true}
        onComplete={() => window.location.reload()}
        onCancel={() => window.location.reload()}
      />
    );
  }

  const handleConfigUpdate = async (newConfig: ApiConfig) => {
    updateConfig(newConfig);
    await handleConfigChange(newConfig);
  };

  const handleRealEstateChange = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="app">
        <ApiConfiguration currentConfig={apiConfig} onConfigChange={handleConfigUpdate} />
        <div className="loading">
          <div>{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (error || !data || !summary || !completeFinancialSummary) {
    return (
      <div className="app">
        <ApiConfiguration currentConfig={apiConfig} onConfigChange={handleConfigUpdate} />
        <div className="error">
          <div>{error || t('noData')}</div>
          <button onClick={refetch}>{t('retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <ApiConfiguration currentConfig={apiConfig} onConfigChange={handleConfigUpdate} />

      <header className="header">
        <h1>{t('dashboard:title')}</h1>
        <p>{t('dashboard:subtitle')}</p>
        {configLoading && <div className="config-loading-indicator">{t('loading_new_data')}</div>}
      </header>

      <FinancialSummary
        summary={completeFinancialSummary}
        ignoreApiDebts={ignoreApiDebts}
        onToggleIgnoreApiDebts={setIgnoreApiDebts}
        showRealEstateForm={showRealEstateForm}
        onToggleRealEstateForm={() => setShowRealEstateForm(!showRealEstateForm)}
      />

      {showRealEstateForm && (
        <RealEstateForm
          onPropertyAdded={handleRealEstateChange}
          onMortgageAdded={handleRealEstateChange}
          onPropertyDeleted={handleRealEstateChange}
          onMortgageDeleted={handleRealEstateChange}
          onClose={() => setShowRealEstateForm(false)}
        />
      )}

      <Filters filters={filters} onFilterChange={setFilters} accountTypes={summary.accountTypes} />

      {!loading && data && filteredAccounts.length > 0 && (
        <BankManager accounts={filteredAccounts} />
      )}

      <Charts
        accounts={filteredAccounts}
        accountsByType={summary.accountsByType}
        accountsByBank={accountsByBank}
        connections={connections}
        connectorMap={connectorMap}
      />

      <InvestmentPerformance investmentAccounts={summary.investmentAccounts} />

      <AccountHistory accounts={data.accounts} />

      {showNewConnectionSetup && (
        <NewConnectionSetup onClose={() => setShowNewConnectionSetup(false)} />
      )}

      <ConnectionManager
        onAccountsRefresh={refetch}
        onToggleNewConnectionSetup={() => setShowNewConnectionSetup(!showNewConnectionSetup)}
      />

      <Footer />
    </div>
  );
}

function App() {
  // Show setup wizard if no apiConfig in localStorage, before mounting any providers or making requests
  if (!localStorage.getItem('apiConfig')) {
    return (
      <InitialSetupWizard
        isVisible={true}
        onComplete={() => window.location.reload()}
        onCancel={() => window.location.reload()}
      />
    );
  }
  return (
    <AppDataProvider>
      <AppContent />
    </AppDataProvider>
  );
}

export default App;
