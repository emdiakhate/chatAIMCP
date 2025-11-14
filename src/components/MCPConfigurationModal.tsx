import React, { useState } from 'react';
import { X, Settings, CheckCircle2, AlertCircle, Code, Brain, Database, Grid, Workflow } from 'lucide-react';
import { GmailConfigModal } from './GmailConfigModal';
import { FilesystemConfigModal } from './FilesystemConfigModal';
import { SlackConfigModal } from './SlackConfigModal';
import { SalesforceConfigModal } from './SalesforceConfigModal';
import { TeamsConfigModal } from './TeamsConfigModal';
import { ApiKeyConfigModal } from './ApiKeyConfigModal';

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
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [showSalesforceConfig, setShowSalesforceConfig] = useState(false);
  const [showTeamsConfig, setShowTeamsConfig] = useState(false);

  // API Key based tools
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [apiKeyProvider, setApiKeyProvider] = useState<string>('');

  if (!isOpen) return null;

  // Helper to get API Key modal props based on provider
  const getApiKeyModalProps = (provider: string) => {
    const propsMap: Record<string, any> = {
      hubspot: {
        providerName: 'HubSpot',
        icon: <Database className="w-6 h-6" style={{ color: '#ff7a59' }} />,
        brandColor: '#ff7a59',
        description: 'Connect your HubSpot CRM',
        keyLabel: 'HubSpot API Key',
        keyPlaceholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        docsUrl: 'https://developers.hubspot.com/docs/api/overview',
        getKeyUrl: 'https://app.hubspot.com/settings/api-key',
        features: [
          { title: 'CRM Access', description: 'Manage contacts, companies, deals, and tickets' },
          { title: 'Marketing Tools', description: 'Create and manage email campaigns' },
          { title: 'Sales Pipeline', description: 'Track and update deals through your sales pipeline' },
        ],
        usageExamples: [
          '"Show me all contacts created this month"',
          '"Create a new deal for Acme Corp worth $50k"',
          '"List all open tickets"',
          '"Find companies in the technology industry"',
        ],
      },
      openai: {
        providerName: 'OpenAI',
        icon: <Brain className="w-6 h-6" style={{ color: '#10a37f' }} />,
        brandColor: '#10a37f',
        description: 'Connect to OpenAI GPT models',
        keyLabel: 'OpenAI API Key',
        keyPlaceholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://platform.openai.com/docs/api-reference',
        getKeyUrl: 'https://platform.openai.com/api-keys',
        features: [
          { title: 'GPT Models', description: 'Access GPT-4, GPT-3.5, and other models' },
          { title: 'Embeddings', description: 'Generate embeddings for text analysis' },
          { title: 'Image Generation', description: 'Create images with DALL·E' },
        ],
        usageExamples: [
          '"Generate embeddings for this text"',
          '"Create an image of a sunset over mountains"',
          '"Analyze sentiment of customer reviews"',
          '"Summarize this document using GPT-4"',
        ],
      },
      anthropic: {
        providerName: 'Anthropic',
        icon: <Code className="w-6 h-6" style={{ color: '#d97757' }} />,
        brandColor: '#d97757',
        description: 'Connect to Claude AI models',
        keyLabel: 'Anthropic API Key',
        keyPlaceholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
        getKeyUrl: 'https://console.anthropic.com/settings/keys',
        features: [
          { title: 'Claude Models', description: 'Access Claude 3 Opus, Sonnet, and Haiku' },
          { title: 'Long Context', description: 'Process up to 200K tokens of context' },
          { title: 'Code & Analysis', description: 'Excel at coding and analytical tasks' },
        ],
        usageExamples: [
          '"Analyze this codebase and suggest improvements"',
          '"Process this 100-page document"',
          '"Write a Python script to parse CSV files"',
          '"Explain this complex technical concept"',
        ],
      },
      airtable: {
        providerName: 'Airtable',
        icon: <Grid className="w-6 h-6" style={{ color: '#ffcc00' }} />,
        brandColor: '#ffcc00',
        description: 'Connect to your Airtable bases',
        keyLabel: 'Airtable Personal Access Token',
        keyPlaceholder: 'patxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://airtable.com/developers/web/api/introduction',
        getKeyUrl: 'https://airtable.com/create/tokens',
        features: [
          { title: 'Base Access', description: 'Read and write data across your bases' },
          { title: 'Records Management', description: 'Create, update, and delete records' },
          { title: 'Attachments', description: 'Upload and download file attachments' },
        ],
        usageExamples: [
          '"Show me all records in the Projects table"',
          '"Create a new task in my Tasks base"',
          '"Update the status of record rec123 to Complete"',
          '"Find all contacts with email ending in @company.com"',
        ],
      },
      linear: {
        providerName: 'Linear',
        icon: <Workflow className="w-6 h-6" style={{ color: '#5e6ad2' }} />,
        brandColor: '#5e6ad2',
        description: 'Connect to Linear project management',
        keyLabel: 'Linear API Key',
        keyPlaceholder: 'lin_api_xxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://developers.linear.app/docs',
        getKeyUrl: 'https://linear.app/settings/api',
        features: [
          { title: 'Issue Management', description: 'Create, update, and track issues' },
          { title: 'Project Tracking', description: 'Monitor project progress and milestones' },
          { title: 'Team Collaboration', description: 'Assign tasks and manage team workflows' },
        ],
        usageExamples: [
          '"Show me all open issues assigned to me"',
          '"Create a new bug report for the login page"',
          '"Update issue ENG-123 to In Progress"',
          '"List all issues in the current sprint"',
        ],
      },
    };

    return propsMap[provider] || {};
  };

  // Route to specific configuration modal based on server type
  const handleConfigure = () => {
    switch (server.server_key) {
      case 'gmail':
        setShowGmailConfig(true);
        break;
      case 'filesystem':
        setShowFilesystemConfig(true);
        break;
      case 'slack':
        setShowSlackConfig(true);
        break;
      case 'salesforce':
        setShowSalesforceConfig(true);
        break;
      case 'teams':
        setShowTeamsConfig(true);
        break;

      // API Key based tools
      case 'hubspot':
      case 'openai':
      case 'anthropic':
      case 'airtable':
      case 'linear':
        setApiKeyProvider(server.server_key);
        setShowApiKeyConfig(true);
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
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
                    {server.server_key === 'slack' && (
                      <>
                        <li>"Send a message to #general channel"</li>
                        <li>"List all channels in my workspace"</li>
                        <li>"Search for messages about 'project update'"</li>
                        <li>"Upload this file to #team channel"</li>
                      </>
                    )}
                    {server.server_key === 'salesforce' && (
                      <>
                        <li>"Show me all open opportunities over $50k"</li>
                        <li>"Find contacts at Acme Corporation"</li>
                        <li>"Create a new lead for Jane Smith"</li>
                        <li>"What are my top 5 accounts by revenue?"</li>
                      </>
                    )}
                    {server.server_key === 'teams' && (
                      <>
                        <li>"Send a message to Marketing team channel"</li>
                        <li>"List all my teams"</li>
                        <li>"Show recent messages in General channel"</li>
                        <li>"Upload this file to Sales team"</li>
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

      <SlackConfigModal
        isOpen={showSlackConfig}
        onClose={() => setShowSlackConfig(false)}
        onConfigured={() => {
          setShowSlackConfig(false);
          onConfigured?.();
        }}
      />

      <SalesforceConfigModal
        isOpen={showSalesforceConfig}
        onClose={() => setShowSalesforceConfig(false)}
        onConfigured={() => {
          setShowSalesforceConfig(false);
          onConfigured?.();
        }}
      />

      <TeamsConfigModal
        isOpen={showTeamsConfig}
        onClose={() => setShowTeamsConfig(false)}
        onConfigured={() => {
          setShowTeamsConfig(false);
          onConfigured?.();
        }}
      />

      {/* API Key based tools */}
      {apiKeyProvider && (
        <ApiKeyConfigModal
          isOpen={showApiKeyConfig}
          onClose={() => {
            setShowApiKeyConfig(false);
            setApiKeyProvider('');
          }}
          onConfigured={() => {
            setShowApiKeyConfig(false);
            setApiKeyProvider('');
            onConfigured?.();
          }}
          provider={apiKeyProvider}
          {...getApiKeyModalProps(apiKeyProvider)}
        />
      )}
    </>
  );
};
