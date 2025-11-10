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
          if (popup) {
            popup.close();
          }
          setStep('success');
          setLoading(false);
          onConfigured?.();
        } else if (event.data?.type === 'oauth-error') {
          window.removeEventListener('message', handleMessage);
          if (popup) {
            popup.close();
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
          popup.close();
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
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configure Gmail</h2>
              <p className="text-sm text-gray-600">Connect your Gmail account</p>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">OAuth Setup Required</p>
                    <p>
                      To use Gmail integration, you need to authorize ChatAI to access your Gmail account.
                      This is done securely through Google's OAuth 2.0 system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">What you'll be able to do:</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Search emails</p>
                      <p className="text-sm text-gray-600">
                        Use Gmail's powerful search syntax to find emails
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Read email content</p>
                      <p className="text-sm text-gray-600">
                        Access full email content, attachments, and metadata
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Send emails</p>
                      <p className="text-sm text-gray-600">
                        Compose and send emails on your behalf
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Permissions requested:</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Read, compose, send, and delete emails from Gmail</li>
                  <li>View email metadata (sender, subject, date)</li>
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Authorizing with Google...
              </h3>
              <p className="text-gray-600">
                Please complete the authorization in the popup window.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gmail Connected Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                You can now use Gmail in your conversations.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">Try asking:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>"Search my emails from john@example.com"</li>
                  <li>"Find unread emails from last week"</li>
                  <li>"Show me emails with subject 'invoice'"</li>
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
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
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
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStep('oauth');
                    handleOAuthStart();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Gmail'}
                </button>
              </>
            )}
            {step === 'success' && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
