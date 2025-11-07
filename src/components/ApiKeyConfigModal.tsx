import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;

  // Customization props
  provider: string;           // 'hubspot', 'openai', 'anthropic', 'airtable', 'linear'
  providerName: string;       // 'HubSpot', 'OpenAI', etc.
  icon?: React.ReactNode;     // Custom icon
  brandColor: string;         // Hex color for branding
  keyLabel?: string;          // Label for the API key field (default: "API Key")
  keyPlaceholder?: string;    // Placeholder text
  docsUrl?: string;           // Link to API docs
  getKeyUrl?: string;         // Link to get API key
  description?: string;       // Short description
  usageExamples?: string[];   // List of usage examples
  features?: Array<{          // List of features/capabilities
    title: string;
    description: string;
  }>;
}

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  provider,
  providerName,
  icon,
  brandColor,
  keyLabel = 'API Key',
  keyPlaceholder = 'Enter your API key...',
  docsUrl,
  getKeyUrl,
  description,
  usageExamples = [],
  features = [],
}) => {
  const [step, setStep] = useState<'intro' | 'configure' | 'success'>('intro');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call backend to store the API key
      const response = await api.configureApiKey(provider, apiKey.trim());

      if (response.success) {
        setStep('success');
      } else {
        setError(response.error || 'Failed to configure API key');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to configure API key');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setApiKey('');
    setStep('intro');
    setError(null);
    onConfigured?.();
    onClose();
  };

  const handleCancel = () => {
    setApiKey('');
    setStep('intro');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              {icon || <Key className="w-6 h-6" style={{ color: brandColor }} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configure {providerName}</h2>
              <p className="text-sm text-gray-600">{description || `Connect your ${providerName} account`}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
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
                    <p className="font-medium mb-1">API Key Required</p>
                    <p>
                      To use {providerName} integration, you need to provide your API key.
                      {getKeyUrl && (
                        <>
                          {' '}You can obtain one from{' '}
                          <a
                            href={getKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-900"
                          >
                            {providerName}'s dashboard
                          </a>.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {features.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">What you'll be able to do:</h3>
                  <div className="grid gap-3">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{feature.title}</p>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usageExamples.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Example queries:</h3>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    {usageExamples.map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'configure' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-900 mb-2">
                    {keyLabel}
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={keyPlaceholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                    style={{ focusRing: brandColor }}
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Your API key will be stored securely and encrypted.
                  </p>
                </div>

                {getKeyUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Don't have an API key yet?
                    </p>
                    <a
                      href={getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                      style={{ color: brandColor }}
                    >
                      Get your {providerName} API key
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
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

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {providerName} Connected!
              </h3>
              <p className="text-gray-600 mb-6">
                Your {providerName} API key has been configured successfully.
              </p>
              {usageExamples.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-gray-900 mb-2">Try asking:</p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    {usageExamples.slice(0, 4).map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                style={{ color: brandColor }}
              >
                API Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'intro' && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('configure')}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: brandColor }}
                >
                  Configure API Key
                </button>
              </>
            )}
            {step === 'configure' && (
              <>
                <button
                  onClick={() => setStep('intro')}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !apiKey.trim()}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Saving...' : 'Save API Key'}
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
