import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface SalesforceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

export const SalesforceConfigModal: React.FC<SalesforceConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
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

      const popup = window.open(
        '/api/auth/salesforce',
        'SalesforceAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth completion
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            setStep('success');
            setLoading(false);
          }, 500);
        }
      }, 500);
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
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Cloud className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configure Salesforce</h2>
              <p className="text-sm text-gray-600">Connect your Salesforce CRM</p>
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
                      To use Salesforce integration, you need to authorize ChatAI to access your Salesforce org.
                      This is done securely through Salesforce's OAuth 2.0 system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">What you'll be able to do:</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Query CRM data</p>
                      <p className="text-sm text-gray-600">
                        Search and retrieve leads, contacts, accounts, and opportunities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Create and update records</p>
                      <p className="text-sm text-gray-600">
                        Add new leads, update contact information, create tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Run reports</p>
                      <p className="text-sm text-gray-600">
                        Execute SOQL queries and generate custom reports
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Manage relationships</p>
                      <p className="text-sm text-gray-600">
                        View and update relationships between accounts, contacts, and opportunities
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Permissions requested:</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Full access to your Salesforce data (api)</li>
                  <li>Perform requests on your behalf at any time (refresh_token, offline_access)</li>
                  <li>Access unique user identifiers (openid, profile, email)</li>
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
                <Cloud className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Authorizing with Salesforce...
              </h3>
              <p className="text-gray-600">
                Please complete the authorization in the popup window.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Salesforce Connected Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                You can now access your Salesforce CRM data.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">Try asking:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>"Show me all open opportunities over $50k"</li>
                  <li>"Find contacts at Acme Corporation"</li>
                  <li>"Create a new lead for Jane Smith at XYZ Inc"</li>
                  <li>"What are my top 5 accounts by revenue?"</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a
              href="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              Salesforce REST API Docs
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
                  {loading ? 'Connecting...' : 'Connect Salesforce'}
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
