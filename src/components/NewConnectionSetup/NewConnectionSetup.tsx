import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiConfig } from '../../hooks/useApiConfig';
import { validateApiConfigForNewConnection } from '../../config/api';
import { AccountsService } from '../../services/accountsService';
import { isAdvancedConnectionStepsEnabled, getCurrentLanguage } from '../../utils/connectionUtils';
import styles from './NewConnectionSetup.module.css';

interface NewConnectionSetupProps {
  onClose: () => void;
  onConnectionAdded?: () => void;
}

type SetupStep = 'configure' | 'get-code' | 'open-url';

export const NewConnectionSetup: React.FC<NewConnectionSetupProps> = ({
  onClose,
  onConnectionAdded,
}) => {
  const { t } = useTranslation(['connections', 'api']);
  const { apiConfig } = useApiConfig();
  const [currentStep, setCurrentStep] = useState<SetupStep>('configure');
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryCode, setTemporaryCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [webviewUrl, setWebviewUrl] = useState<string>('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  const isConfigValid = validateApiConfigForNewConnection(apiConfig);

  // Check if we should use advanced mode or simplified mode
  useEffect(() => {
    const shouldUseAdvanced = isAdvancedConnectionStepsEnabled();
    setIsAdvancedMode(shouldUseAdvanced);

    // If simplified mode and config is valid, we can skip the step progression
    if (!shouldUseAdvanced && isConfigValid) {
      setCurrentStep('get-code');
    }
  }, [isConfigValid]);

  // Auto-advance to step 1 if config is already valid
  React.useEffect(() => {
    if (isConfigValid && currentStep === 'configure') {
      setCurrentStep('get-code');
    }
  }, [isConfigValid, currentStep]);

  const handleGetTemporaryCode = async () => {
    if (!isConfigValid) {
      setError(t('config_incomplete_api_setup'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await AccountsService.getTemporaryCode(apiConfig);
      setTemporaryCode(result.code);
      setCurrentStep('open-url');

      // Build the webview URL
      const url = AccountsService.buildWebviewUrl(apiConfig.clientId, result.code, apiConfig);
      setWebviewUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors:unknown_error');
      setError(t('temp_code_fetch_failed', { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWebview = () => {
    if (webviewUrl) {
      window.open(webviewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    }
  };

  const handleReset = () => {
    setCurrentStep('configure');
    setTemporaryCode('');
    setError('');
    setWebviewUrl('');
  };

  // Simplified one-click connection flow for new connections
  const handleOneClickBankConnection = async () => {
    if (!isConfigValid) {
      setError(
        t(
          'api:config_incomplete_error',
          'Configuration incomplète. Veuillez configurer tous les champs requis dans les paramètres API.'
        )
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the unified service method to get code and URL directly
      const lang = getCurrentLanguage();

      const result = await AccountsService.getConnectionUrlDirectly(
        apiConfig,
        undefined, // No connection ID for new connections
        'connect',
        lang
      );

      // Store the code/URL and immediately open the webview
      setTemporaryCode(result.code);
      setWebviewUrl(result.url);

      // Open the webview directly with close detection
      const popup = AccountsService.openConnectionWebview(result.url, () => {
        // Popup was closed - notify parent and close the modal
        setTimeout(() => {
          if (typeof onConnectionAdded === 'function') {
            onConnectionAdded();
          }
          onClose();
        }, 500);
      });

      if (popup) {
        setError(''); // Clear any previous errors
      } else {
        setError(
          t(
            'api:popup_blocked_message',
            'Le popup a été bloqué. Veuillez autoriser les popups pour ce site et réessayer.'
          )
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('errors:unknown_error', 'Erreur inconnue');
      setError(
        t(
          'api:failed_to_open_connection',
          `Échec de l'ouverture de l'interface de connexion: ${errorMessage}`
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdvancedMode = () => {
    const newAdvancedMode = !isAdvancedMode;
    setIsAdvancedMode(newAdvancedMode);

    // Save the preference
    try {
      const saved = localStorage.getItem('apiConfig');
      if (saved) {
        const config = JSON.parse(saved);
        config.showAdvancedConnectionSteps = newAdvancedMode;
        localStorage.setItem('apiConfig', JSON.stringify(config));
      }
    } catch (error) {
      console.error('Error saving advanced mode preference:', error);
    }

    // Reset to appropriate step
    if (newAdvancedMode) {
      setCurrentStep(isConfigValid ? 'get-code' : 'configure');
    } else {
      setCurrentStep('get-code');
    }

    // Clear any existing state
    setTemporaryCode('');
    setWebviewUrl('');
    setError('');
  };

  const renderConfigureStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>{t('config_required_title')}</h3>
        <p>{t('config_required_description')}</p>
      </div>

      <div className={styles.configCheck}>
        <div className={styles.configItem}>
          <span className={apiConfig.apiUrl ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.apiUrl ? '✅' : '❌'}
          </span>
          <span>
            {t('api_domain_check')}: {apiConfig.apiUrl || t('not_configured')}
          </span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.userId ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.userId ? '✅' : '❌'}
          </span>
          <span>
            {t('user_id_check')}: {apiConfig.userId || t('not_configured')}
          </span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.bearerToken ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.bearerToken ? '✅' : '❌'}
          </span>
          <span>
            {t('bearer_token_check')}:{' '}
            {apiConfig.bearerToken ? t('configured_hidden') : t('not_configured')}
          </span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.clientId ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.clientId ? '✅' : '❌'}
          </span>
          <span>
            {t('client_id_check')}: {apiConfig.clientId || t('not_configured')}
          </span>
        </div>
      </div>

      {!isConfigValid && (
        <div className={styles.warning}>
          <p>{t('config_incomplete_warning')}</p>
        </div>
      )}

      <div className={styles.stepActions}>
        <button
          onClick={() => setCurrentStep('get-code')}
          disabled={!isConfigValid}
          className={styles.btnPrimary}
        >
          {t('continue_to_step_1')}
        </button>
      </div>
    </div>
  );

  const renderGetCodeStep = () => {
    // Simplified mode UI
    if (!isAdvancedMode) {
      return (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <h3>{t('api:add_bank_connection')}</h3>
            <p>{t('api:one_click_connection_info')}</p>
          </div>

          {error && (
            <div className={styles.error}>
              <span>❌ {error}</span>
            </div>
          )}

          <div className={styles.stepActions}>
            <button
              onClick={handleOneClickBankConnection}
              disabled={isLoading || !isConfigValid}
              className={styles.btnPrimary}
            >
              {isLoading ? t('api:connecting_to_bank') : t('api:add_bank_connection')}
            </button>

            <button onClick={toggleAdvancedMode} className={styles.btnSecondary}>
              {t('api:switch_to_advanced_mode')}
            </button>
          </div>
        </div>
      );
    }

    // Advanced mode UI (original)
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h3>{t('step_1_get_temp_code')}</h3>
          <p>{t('step_1_description')}</p>
        </div>

        {error && (
          <div className={styles.error}>
            <span>❌ {error}</span>
          </div>
        )}

        <div className={styles.stepActions}>
          <button
            onClick={handleGetTemporaryCode}
            disabled={isLoading}
            className={styles.btnPrimary}
          >
            {isLoading ? t('fetching_in_progress') : t('get_temp_code')}
          </button>

          <button onClick={toggleAdvancedMode} className={styles.btnSecondary}>
            {t('api:switch_to_simple_mode')}
          </button>

          <button onClick={() => setCurrentStep('configure')} className={styles.btnSecondary}>
            {t('common:back')}
          </button>
        </div>
      </div>
    );
  };

  const renderOpenUrlStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>{t('step_2_open_connection')}</h3>
        <p>{t('step_2_description')}</p>
      </div>

      <div className={styles.codeDisplay}>
        <label>{t('temp_code_obtained')}:</label>
        <div className={styles.codeValue}>
          <code>{temporaryCode}</code>
        </div>
      </div>

      <div className={styles.urlPreview}>
        <label>{t('connection_url')}:</label>
        <div className={styles.urlValue}>
          <code>{webviewUrl}</code>
        </div>
      </div>

      <div className={styles.stepActions}>
        <button onClick={handleOpenWebview} className={styles.btnPrimary}>
          {t('open_connection_page')}
        </button>

        <button onClick={handleReset} className={styles.btnSecondary}>
          {t('restart')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{t('new_connection_title')}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Only show progress bar in advanced mode */}
        {isAdvancedMode && (
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressStep} ${currentStep === 'configure' ? styles.active : styles.completed}`}
            >
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepLabel}>{t('step_label_configuration')}</span>
            </div>
            <div
              className={`${styles.progressStep} ${currentStep === 'get-code' ? styles.active : currentStep === 'open-url' ? styles.completed : ''}`}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>{t('step_label_temp_code')}</span>
            </div>
            <div
              className={`${styles.progressStep} ${currentStep === 'open-url' ? styles.active : ''}`}
            >
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepLabel}>{t('step_label_connection')}</span>
            </div>
          </div>
        )}

        <div className={styles.content}>
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'get-code' && renderGetCodeStep()}
          {currentStep === 'open-url' && renderOpenUrlStep()}
        </div>
      </div>
    </div>
  );
};
