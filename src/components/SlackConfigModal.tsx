import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface SlackConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

export const SlackConfigModal: React.FC<SlackConfigModalProps> = ({
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
        '/api/auth/slack',
        'SlackAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth completion
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          // Check if OAuth was successful
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
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configure Slack</h2>
              <p className="text-sm text-gray-600">Connect your Slack workspace</p>
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
                      To use Slack integration, you need to authorize ChatAI to access your Slack workspace.
                      This is done securely through Slack's OAuth 2.0 system.
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
                      <p className="font-medium text-gray-900">Send messages</p>
                      <p className="text-sm text-gray-600">
                        Post messages to channels and direct messages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Read conversations</p>
                      <p className="text-sm text-gray-600">
                        Search and read messages from channels you have access to
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Manage channels</p>
                      <p className="text-sm text-gray-600">
                        List channels, get channel info, and manage membership
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">File operations</p>
                      <p className="text-sm text-gray-600">
                        Upload and download files shared in your workspace
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Permissions requested:</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Read messages and channel information</li>
                  <li>Send messages on your behalf</li>
                  <li>Access user and channel data</li>
                  <li>Upload and download files</li>
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Authorizing with Slack...
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
                Slack Connected Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                You can now use Slack in your conversations.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">Try asking:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>"Send a message to #general channel"</li>
                  <li>"List all channels in my workspace"</li>
                  <li>"Search for messages about 'project update'"</li>
                  <li>"Upload this file to #team channel"</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a
              href="https://api.slack.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
            >
              Slack API Docs
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Slack'}
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
