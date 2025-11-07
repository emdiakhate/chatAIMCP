import React, { useState } from 'react';
import { X, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { GmailConfigModal } from './GmailConfigModal';
import { FilesystemConfigModal } from './FilesystemConfigModal';

interface MCPConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: {
    id: number;
    server_key: string;
    name: string;
    icon: string;
    description: string;
    requires_auth: boolean;
    auth_type?: string;
    auth_provider?: string;
  };
  connection?: any;
  onConfigured?: () => void;
}

export const MCPConfigurationModal: React.FC<MCPConfigurationModalProps> = ({
  isOpen,
  onClose,
  server,
  connection,
  onConfigured,
}) => {
  const [showGmailConfig, setShowGmailConfig] = useState(false);
  const [showFilesystemConfig, setShowFilesystemConfig] = useState(false);

  if (!isOpen) return null;

  // Route to specific configuration modal based on server type
  const handleConfigure = () => {
    switch (server.server_key) {
      case 'gmail':
        setShowGmailConfig(true);
        break;
      case 'filesystem':
        setShowFilesystemConfig(true);
        break;
      case 'gdrive':
        // Similar to Gmail OAuth
        alert('Google Drive OAuth configuration coming soon');
        break;
      case 'github':
        alert('GitHub OAuth configuration coming soon');
        break;
      default:
        alert(`Configuration for ${server.name} is not yet available`);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                {server.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Configure {server.name}</h2>
                <p className="text-sm text-gray-600">{server.description}</p>
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
            <div className="space-y-4">
              {/* Connection Status */}
              {connection ? (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Connected</p>
                    <p className="text-sm text-green-700 mt-1">
                      This tool is active and ready to use in your conversations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">Not Connected</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Complete the configuration to start using this tool.
                    </p>
                  </div>
                </div>
              )}

              {/* Auth Requirements */}
              {server.requires_auth && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Authentication</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {server.auth_type === 'oauth2'
                            ? 'OAuth 2.0 Required'
                            : 'Authentication Required'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {server.auth_provider
                            ? `Provider: ${server.auth_provider}`
                            : 'Secure authentication via ' + server.auth_type}
                        </p>
                      </div>
                      <Settings className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Options */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Click the button below to configure {server.name} settings.
                  </p>
                  <button
                    onClick={handleConfigure}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Configure {server.name}
                  </button>
                </div>
              </div>

              {/* Usage Examples */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Usage Examples</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Once configured, you can ask questions like:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    {server.server_key === 'gmail' && (
                      <>
                        <li>"Search my emails from john@example.com"</li>
                        <li>"Show unread emails from last week"</li>
                        <li>"Find emails with subject 'invoice'"</li>
                      </>
                    )}
                    {server.server_key === 'filesystem' && (
                      <>
                        <li>"Read the file README.md"</li>
                        <li>"List all files in the documents folder"</li>
                        <li>"Show me the content of config.json"</li>
                      </>
                    )}
                    {server.server_key === 'gdrive' && (
                      <>
                        <li>"Find documents named 'Q4 Report'"</li>
                        <li>"List recent files in my Drive"</li>
                        <li>"Show me spreadsheets modified this week"</li>
                      </>
                    )}
                    {server.server_key === 'github' && (
                      <>
                        <li>"List my GitHub repositories"</li>
                        <li>"Show open issues in myrepo"</li>
                        <li>"Find pull requests needing review"</li>
                      </>
                    )}
                    {server.server_key === 'memory' && (
                      <>
                        <li>"Remember that I prefer Python over JavaScript"</li>
                        <li>"What do you know about my preferences?"</li>
                        <li>"Recall what we discussed about the project"</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <GmailConfigModal
        isOpen={showGmailConfig}
        onClose={() => setShowGmailConfig(false)}
        onConfigured={() => {
          setShowGmailConfig(false);
          onConfigured?.();
        }}
      />

      {connection && (
        <FilesystemConfigModal
          isOpen={showFilesystemConfig}
          onClose={() => setShowFilesystemConfig(false)}
          connection={connection}
          onSaved={() => {
            setShowFilesystemConfig(false);
            onConfigured?.();
          }}
        />
      )}
    </>
  );
};
