import React, { useState } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface GmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
  scope?: 'gmail' | 'drive' | 'sheets'; // Scope OAuth à utiliser
}

export const GmailConfigModal: React.FC<GmailConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  scope = 'gmail',
}) => {
  const [step, setStep] = useState<'intro' | 'oauth' | 'success'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration spécifique selon le scope
  const getServiceConfig = () => {
    switch (scope) {
      case 'drive':
        return {
          name: 'Google Drive',
          icon: '📁',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Connectez votre compte Google Drive',
          features: [
            { title: 'Rechercher des fichiers', description: 'Recherchez dans vos fichiers et dossiers' },
            { title: 'Lire le contenu', description: 'Accédez au contenu de vos documents' },
            { title: 'Créer et modifier', description: 'Créez et modifiez des fichiers dans Drive' },
          ],
          permissions: [
            'Voir, créer et modifier vos fichiers Google Drive',
            'Rechercher dans vos dossiers et fichiers',
          ],
          tryAsking: [
            '"Recherche mes fichiers contenant \'rapport\'"',
            '"Montre-moi mes fichiers récents"',
            '"Crée un nouveau document dans Drive"',
          ],
        };
      case 'sheets':
        return {
          name: 'Google Sheets',
          icon: '📊',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Connectez votre compte Google Sheets',
          features: [
            { title: 'Lire les données', description: 'Accédez aux données de vos feuilles' },
            { title: 'Créer des feuilles', description: 'Créez de nouvelles feuilles de calcul' },
            { title: 'Modifier les données', description: 'Mettez à jour vos données' },
          ],
          permissions: [
            'Voir, créer et modifier vos feuilles Google Sheets',
            'Lire et écrire des données dans vos feuilles',
          ],
          tryAsking: [
            '"Affiche les données de ma feuille de budget"',
            '"Crée une nouvelle feuille de calcul"',
            '"Ajoute une ligne dans ma feuille d\'inventaire"',
          ],
        };
      default: // gmail
        return {
          name: 'Gmail',
          icon: '📧',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Connectez votre compte Gmail',
          features: [
            { title: 'Rechercher des emails', description: 'Utilisez la recherche puissante de Gmail' },
            { title: 'Lire le contenu', description: 'Accédez au contenu complet des emails' },
            { title: 'Envoyer des emails', description: 'Composez et envoyez des emails' },
          ],
          permissions: [
            'Lire, composer, envoyer et supprimer des emails depuis Gmail',
            'Voir les métadonnées des emails (expéditeur, sujet, date)',
          ],
          tryAsking: [
            '"Recherche mes emails de john@example.com"',
            '"Trouve les emails non lus de la semaine dernière"',
            '"Montre-moi les emails avec le sujet \'facture\'"',
          ],
        };
    }
  };

  const serviceConfig = getServiceConfig();

  if (!isOpen) return null;

  const handleOAuthStart = async () => {
    try {
      setLoading(true);
      setError(null);

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Utiliser l'URL complète du backend pour éviter l'interception par React Router
      const backendUrl = 'http://localhost:3001';
      const token = localStorage.getItem('token');
      
      // Passer le token dans l'URL car window.open() ne peut pas envoyer de headers
      const oauthUrl = token 
        ? `${backendUrl}/api/auth/google?scope=${scope}&token=${encodeURIComponent(token)}`
        : `${backendUrl}/api/auth/google?scope=${scope}`;
      
      const popup = window.open(
        oauthUrl,
        'GoogleAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.');
        setLoading(false);
        return;
      }

      // Listen for OAuth completion via postMessage
      const handleMessage = (event: MessageEvent) => {
        // Accept messages from localhost:3001 (backend)
        if (event.origin !== 'http://localhost:3001' && event.origin !== window.location.origin) {
          return;
        }

        if (event.data?.type === 'oauth-success') {
          window.removeEventListener('message', handleMessage);
          // Demander à la popup de se fermer elle-même (évite les erreurs COOP)
          if (popup) {
            try {
              popup.postMessage({ type: 'close' }, event.origin);
            } catch (e) {
              // Ignorer les erreurs de postMessage
            }
            // Essayer de fermer, mais ignorer les erreurs COOP
            try {
              popup.close();
            } catch (e) {
              // Ignorer les erreurs COOP - la popup se fermera d'elle-même
            }
          }
          setStep('success');
          setLoading(false);
          onConfigured?.();
        } else if (event.data?.type === 'oauth-error') {
          window.removeEventListener('message', handleMessage);
          // Demander à la popup de se fermer elle-même (évite les erreurs COOP)
          if (popup) {
            try {
              popup.postMessage({ type: 'close' }, event.origin);
            } catch (e) {
              // Ignorer les erreurs de postMessage
            }
            // Essayer de fermer, mais ignorer les erreurs COOP
            try {
              popup.close();
            } catch (e) {
              // Ignorer les erreurs COOP - la popup se fermera d'elle-même
            }
          }
          setError(event.data.message || 'OAuth authorization failed');
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: check if popup is closed (for browsers that don't support postMessage)
      let currentStep = 'oauth';
      const checkPopup = setInterval(() => {
        try {
        if (popup?.closed) {
          clearInterval(checkPopup);
            window.removeEventListener('message', handleMessage);
            // Give a moment for postMessage to arrive
          setTimeout(() => {
              // If still in oauth step, assume it was closed manually
              setError('Authorization was cancelled or the popup was closed.');
            setLoading(false);
            }, 1000);
          }
        } catch (e) {
          // Ignore COOP errors when checking window.closed
          // postMessage will handle the communication
        }
      }, 500);

      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        window.removeEventListener('message', handleMessage);
        if (popup && !popup.closed) {
          // Essayer de fermer, mais ignorer les erreurs COOP
          try {
            popup.close();
          } catch (e) {
            // Ignorer les erreurs COOP
          }
        }
        if (loading) {
          setError('Authorization timed out. Please try again.');
          setLoading(false);
        }
      }, 5 * 60 * 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onConfigured?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${serviceConfig.bgColor} rounded-lg flex items-center justify-center text-2xl`}>
              {serviceConfig.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configurer {serviceConfig.name}</h2>
              <p className="text-sm text-gray-600">{serviceConfig.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Configuration OAuth requise</p>
                    <p>
                      Pour utiliser {serviceConfig.name}, vous devez autoriser ChatAI à accéder à votre compte.
                      Ceci est fait de manière sécurisée via le système OAuth 2.0 de Google.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Ce que vous pourrez faire :</h3>
                <div className="grid gap-3">
                  {serviceConfig.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{feature.title}</p>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Permissions demandées :</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  {serviceConfig.permissions.map((permission, index) => (
                    <li key={index}>{permission}</li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Error</p>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'oauth' && (
            <div className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 ${serviceConfig.bgColor} rounded-full mb-4 text-4xl`}>
                {serviceConfig.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Autorisation avec Google...
              </h3>
              <p className="text-gray-600">
                Veuillez compléter l'autorisation dans la fenêtre popup.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {serviceConfig.name} connecté avec succès !
              </h3>
              <p className="text-gray-600 mb-6">
                Vous pouvez maintenant utiliser {serviceConfig.name} dans vos conversations.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">Essayez de demander :</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  {serviceConfig.tryAsking.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a
              href="https://developers.google.com/gmail/api/guides"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
            >
              Gmail API Docs
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-3">
            {step === 'intro' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setStep('oauth');
                    handleOAuthStart();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connexion...' : `Connecter ${serviceConfig.name}`}
                </button>
              </>
            )}
            {step === 'success' && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Terminé
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
