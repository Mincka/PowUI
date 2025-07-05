import React, { useState, useEffect } from 'react';
import { useApiConfig } from '../../hooks/useApiConfig';
import { validateApiConfigForNewConnection } from '../../config/api';
import { AccountsService } from '../../services/accountsService';
import { useLanguage } from '../../i18n/hooks/useLanguage';
import { isAdvancedConnectionStepsEnabled } from '../../utils/connectionUtils';
import { useTranslation } from 'react-i18next';
import styles from './ConnectionWebviewSetup.module.css';

interface ConnectionWebviewSetupProps {
  connectionId: number;
  connectionBankName: string;
  mode: 'manage' | 'reconnect';
  onClose: () => void;
}

type SetupStep = 'configure' | 'get-code' | 'open-url';

export const ConnectionWebviewSetup: React.FC<ConnectionWebviewSetupProps> = ({
  connectionId,
  connectionBankName,
  mode,
  onClose,
}) => {
  const { apiConfig } = useApiConfig();
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation('api');
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

  const getModalTitle = () => {
    return mode === 'reconnect' ? '🔐 Ré-authentification' : '⚙️ Gestion de connexion';
  };

  const getStepTitle = () => {
    return mode === 'reconnect' ? 'Ré-authentifier la connexion' : 'Gérer la connexion';
  };

  const getStepDescription = () => {
    return mode === 'reconnect'
      ? `Ré-authentifiez votre connexion ${connectionBankName} pour résoudre les problèmes d'authentification.`
      : `Gérez les comptes et paramètres de votre connexion ${connectionBankName}.`;
  };

  const getActionLabel = () => {
    return mode === 'reconnect' ? 'Ré-authentification' : 'Gestion';
  };

  const getUrlLabel = () => {
    return mode === 'reconnect' ? 'URL de ré-authentification:' : 'URL de gestion:';
  };

  const getOpenButtonText = () => {
    return mode === 'reconnect' ? '🔐 Ouvrir la ré-authentification' : '🌐 Ouvrir la gestion';
  };

  const getStepLabel = () => {
    return mode === 'reconnect' ? 'Ré-authentification' : 'Gestion';
  };

  const handleGetTemporaryCode = async () => {
    if (!isConfigValid) {
      setError(
        "Configuration incomplète. Veuillez configurer le domaine, l'ID utilisateur, le token bearer et l'ID client dans les paramètres API."
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await AccountsService.getTemporaryCode(apiConfig);
      setTemporaryCode(result.code);
      setCurrentStep('open-url');

      // Build the webview URL based on mode
      const lang = currentLanguage === 'en' ? 'en' : 'fr';
      const url =
        mode === 'reconnect'
          ? AccountsService.buildReconnectWebviewUrl(connectionId, result.code, apiConfig, lang)
          : AccountsService.buildManageWebviewUrl(connectionId, result.code, apiConfig, lang);

      setWebviewUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Échec de la récupération du code temporaire: ${errorMessage}`);
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

  // Simplified one-click connection flow
  const handleOneClickConnection = async () => {
    if (!isConfigValid) {
      setError(
        t(
          'config_incomplete_error',
          'Configuration incomplète. Veuillez configurer tous les champs requis dans les paramètres API.'
        )
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the unified service method to get code and URL directly
      const connectionMode = mode === 'reconnect' ? 'reconnect' : 'manage';
      const lang = currentLanguage === 'en' ? 'en' : 'fr';

      const result = await AccountsService.getConnectionUrlDirectly(
        apiConfig,
        connectionId,
        connectionMode,
        lang
      );

      // For simplified mode, we store the code/URL but immediately open the webview
      setTemporaryCode(result.code);
      setWebviewUrl(result.url);

      // Open the webview directly with close detection
      const popup = AccountsService.openConnectionWebview(result.url, () => {
        // Popup was closed - close the modal after a brief delay
        setTimeout(() => {
          onClose();
        }, 500);
      });

      if (popup) {
        // Show success message and clear any previous errors
        setError('');
        // Don't auto-close, let the popup close detection handle it
      } else {
        setError(
          t(
            'popup_blocked_message',
            'Le popup a été bloqué. Veuillez autoriser les popups pour ce site et réessayer.'
          )
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('errors:unknown_error', 'Erreur inconnue');
      setError(
        t(
          'failed_to_open_connection',
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
        <h3>📋 Configuration requise</h3>
        <p>
          Avant de gérer votre connexion, assurez-vous que votre configuration API est complète.
        </p>
      </div>

      <div className={styles.connectionInfo}>
        <div className={styles.connectionDetail}>
          <span className={styles.label}>Connexion:</span>
          <span className={styles.value}>
            #{connectionId} - {connectionBankName}
          </span>
        </div>
        <div className={styles.connectionDetail}>
          <span className={styles.label}>Action:</span>
          <span className={styles.value}>{getActionLabel()}</span>
        </div>
      </div>

      <div className={styles.configCheck}>
        <div className={styles.configItem}>
          <span className={apiConfig.apiUrl ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.apiUrl ? '✅' : '❌'}
          </span>
          <span>Domaine API: {apiConfig.apiUrl || 'Non configuré'}</span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.userId ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.userId ? '✅' : '❌'}
          </span>
          <span>ID Utilisateur: {apiConfig.userId || 'Non configuré'}</span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.bearerToken ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.bearerToken ? '✅' : '❌'}
          </span>
          <span>Token Bearer: {apiConfig.bearerToken ? '***configuré***' : 'Non configuré'}</span>
        </div>

        <div className={styles.configItem}>
          <span className={apiConfig.clientId ? styles.checkValid : styles.checkInvalid}>
            {apiConfig.clientId ? '✅' : '❌'}
          </span>
          <span>ID Client: {apiConfig.clientId || 'Non configuré'}</span>
        </div>
      </div>

      {!isConfigValid && (
        <div className={styles.warning}>
          <p>
            ⚠️ Configuration incomplète. Veuillez ouvrir les paramètres API pour configurer tous les
            champs requis.
          </p>
        </div>
      )}

      <div className={styles.stepActions}>
        <button
          onClick={() => setCurrentStep('get-code')}
          disabled={!isConfigValid}
          className={styles.btnPrimary}
        >
          Continuer vers l&apos;étape 1
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
            <h3>{mode === 'reconnect' ? t('reconnect_to_bank') : t('open_bank_management')}</h3>
            <p>{t('one_click_connection_info')}</p>
          </div>

          <div className={styles.connectionInfo}>
            <div className={styles.connectionDetail}>
              <span className={styles.label}>Connexion:</span>
              <span className={styles.value}>
                #{connectionId} - {connectionBankName}
              </span>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <span>❌ {error}</span>
            </div>
          )}

          <div className={styles.stepActions}>
            <button
              onClick={handleOneClickConnection}
              disabled={isLoading || !isConfigValid}
              className={styles.btnPrimary}
            >
              {isLoading
                ? t('opening_connection')
                : mode === 'reconnect'
                  ? t('reconnect_to_bank')
                  : t('open_bank_management')}
            </button>

            <button onClick={toggleAdvancedMode} className={styles.btnSecondary}>
              {t('switch_to_advanced_mode')}
            </button>
          </div>
        </div>
      );
    }

    // Advanced mode UI (original)
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h3>🔑 Étape 1: Obtenir le code temporaire</h3>
          <p>
            Cliquez sur le bouton ci-dessous pour récupérer un code temporaire depuis l&apos;API.
          </p>
        </div>

        <div className={styles.connectionInfo}>
          <div className={styles.connectionDetail}>
            <span className={styles.label}>Connexion:</span>
            <span className={styles.value}>
              #{connectionId} - {connectionBankName}
            </span>
          </div>
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
            {isLoading ? '🔄 Récupération en cours...' : '🔑 Obtenir le code temporaire'}
          </button>

          <button onClick={toggleAdvancedMode} className={styles.btnSecondary}>
            {t('switch_to_simple_mode')}
          </button>

          <button onClick={() => setCurrentStep('configure')} className={styles.btnSecondary}>
            Retour
          </button>
        </div>
      </div>
    );
  };

  const renderOpenUrlStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>🌐 Étape 2: {getStepTitle()}</h3>
        <p>Code temporaire récupéré avec succès ! {getStepDescription()}</p>
      </div>

      <div className={styles.connectionInfo}>
        <div className={styles.connectionDetail}>
          <span className={styles.label}>Connexion:</span>
          <span className={styles.value}>
            #{connectionId} - {connectionBankName}
          </span>
        </div>
      </div>

      <div className={styles.codeDisplay}>
        <label>Code temporaire obtenu:</label>
        <div className={styles.codeValue}>
          <code>{temporaryCode}</code>
        </div>
      </div>

      <div className={styles.urlPreview}>
        <label>{getUrlLabel()}</label>
        <div className={styles.urlValue}>
          <code>{webviewUrl}</code>
        </div>
      </div>

      <div className={styles.stepActions}>
        <button onClick={handleOpenWebview} className={styles.btnPrimary}>
          {getOpenButtonText()}
        </button>

        <button onClick={handleReset} className={styles.btnSecondary}>
          Recommencer
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{getModalTitle()}</h2>
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
              <span className={styles.stepLabel}>Configuration</span>
            </div>
            <div
              className={`${styles.progressStep} ${currentStep === 'get-code' ? styles.active : currentStep === 'open-url' ? styles.completed : ''}`}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>Code temporaire</span>
            </div>
            <div
              className={`${styles.progressStep} ${currentStep === 'open-url' ? styles.active : ''}`}
            >
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepLabel}>{getStepLabel()}</span>
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
