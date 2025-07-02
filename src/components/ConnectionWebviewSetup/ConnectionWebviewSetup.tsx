import React, { useState } from 'react';
import { useApiConfig } from '../../hooks/useApiConfig';
import { validateApiConfigForNewConnection } from '../../config/api';
import { AccountsService } from '../../services/accountsService';
import { useLanguage } from '../../i18n/hooks/useLanguage';
import styles from './ConnectionWebviewSetup.module.css';

interface ConnectionWebviewSetupProps {
  connectionId: number;
  connectionBankName: string;
  mode: 'manage';
  onClose: () => void;
}

type SetupStep = 'configure' | 'get-code' | 'open-url';

export const ConnectionWebviewSetup: React.FC<ConnectionWebviewSetupProps> = ({
  connectionId,
  connectionBankName,
  onClose,
}) => {
  const { apiConfig } = useApiConfig();
  const { currentLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState<SetupStep>('configure');
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryCode, setTemporaryCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [webviewUrl, setWebviewUrl] = useState<string>('');

  const isConfigValid = validateApiConfigForNewConnection(apiConfig);

  // Auto-advance to step 1 if config is already valid
  React.useEffect(() => {
    if (isConfigValid && currentStep === 'configure') {
      setCurrentStep('get-code');
    }
  }, [isConfigValid, currentStep]);

  const getModalTitle = () => {
    return '⚙️ Gestion de connexion';
  };

  const getStepTitle = () => {
    return 'Gérer la connexion';
  };

  const getStepDescription = () => {
    return `Gérez les comptes et paramètres de votre connexion ${connectionBankName}.`;
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

      // Build the webview URL for manage mode
      const lang = currentLanguage === 'en' ? 'en' : 'fr';
      const url = AccountsService.buildManageWebviewUrl(connectionId, result.code, apiConfig, lang);

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
          <span className={styles.value}>Gestion</span>
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

  const renderGetCodeStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>🔑 Étape 1: Obtenir le code temporaire</h3>
        <p>Cliquez sur le bouton ci-dessous pour récupérer un code temporaire depuis l&apos;API.</p>
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
        <button onClick={handleGetTemporaryCode} disabled={isLoading} className={styles.btnPrimary}>
          {isLoading ? '🔄 Récupération en cours...' : '🔑 Obtenir le code temporaire'}
        </button>

        <button onClick={() => setCurrentStep('configure')} className={styles.btnSecondary}>
          Retour
        </button>
      </div>
    </div>
  );

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
        <label>URL de gestion:</label>
        <div className={styles.urlValue}>
          <code>{webviewUrl}</code>
        </div>
      </div>

      <div className={styles.stepActions}>
        <button onClick={handleOpenWebview} className={styles.btnPrimary}>
          🌐 Ouvrir la gestion
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
            <span className={styles.stepLabel}>Gestion</span>
          </div>
        </div>

        <div className={styles.content}>
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'get-code' && renderGetCodeStep()}
          {currentStep === 'open-url' && renderOpenUrlStep()}
        </div>
      </div>
    </div>
  );
};
