import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MCPServerCard } from './MCPServerCard';
import { X, Search, Loader2 } from 'lucide-react';
import { ApiKeyConfigModal } from './ApiKeyConfigModal';
import { GmailConfigModal } from './GmailConfigModal';
import { SlackConfigModal } from './SlackConfigModal';
import { SalesforceConfigModal } from './SalesforceConfigModal';
import { TeamsConfigModal } from './TeamsConfigModal';

interface MCPMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionCreated?: () => void;
}

export const MCPMarketplace: React.FC<MCPMarketplaceProps> = ({
  isOpen,
  onClose,
  onConnectionCreated,
}) => {
  const [servers, setServers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [apiKeyProvider, setApiKeyProvider] = useState<string>('');
  const [showGmailConfig, setShowGmailConfig] = useState(false);
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [showSalesforceConfig, setShowSalesforceConfig] = useState(false);
  const [showTeamsConfig, setShowTeamsConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [serversRes, connectionsRes, categoriesRes] = await Promise.all([
        api.getMCPServers(),
        api.getMCPConnections(),
        api.getMCPCategories(),
      ]);

      console.log('[MCPMarketplace] API Response:', {
        serversCount: serversRes.servers?.length,
        servers: serversRes.servers,
        total: serversRes.total,
        connections: connectionsRes.connections,
        categories: categoriesRes.categories
      });

      setServers(serversRes.servers || []);
      setConnections(connectionsRes.connections || []);
      setCategories([{ key: 'all', name: 'All', serverCount: serversRes.total }, ...(categoriesRes.categories || [])]);

      console.log('[MCPMarketplace] State updated:', {
        serversCount: serversRes.servers?.length,
        connectionsCount: connectionsRes.connections?.length
      });
    } catch (error: any) {
      console.error('Failed to load marketplace data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const isServerConnected = (serverId: number) => {
    return connections.some((conn) => conn.server_id === serverId);
  };

  const handleConnect = (server: any) => {
    setSelectedServer(server);
    setShowConnectionModal(true);
  };

  const handleConfirmConnect = async () => {
    if (!selectedServer) return;

    // Si le serveur nécessite une API key, ouvrir le modal de configuration
    if (selectedServer.auth_type === 'api_key' && selectedServer.requires_auth) {
      setShowConnectionModal(false);
      setApiKeyProvider(selectedServer.server_key);
      setShowApiKeyConfig(true);
      return;
    }

    // Si le serveur nécessite OAuth, ouvrir le modal OAuth approprié
    if (selectedServer.auth_type === 'oauth2' && selectedServer.requires_auth) {
      setShowConnectionModal(false);
      switch (selectedServer.server_key) {
        case 'gmail':
          setShowGmailConfig(true);
          return;
        case 'gdrive':
          // Google Drive utilise le même OAuth que Gmail mais avec un scope différent
          setShowGmailConfig(true);
          return;
        case 'gsheets':
          // Google Sheets utilise le même OAuth que Gmail mais avec un scope différent
          setShowGmailConfig(true);
          return;
        case 'slack':
          setShowSlackConfig(true);
          return;
        case 'salesforce':
          setShowSalesforceConfig(true);
          return;
        case 'teams':
          setShowTeamsConfig(true);
          return;
        default:
          alert(`OAuth configuration for ${selectedServer.name} is not yet implemented. Please configure it manually.`);
          return;
      }
    }

    // Pour les outils sans authentification, créer directement la connexion
    try {
      setConnecting(true);
      await api.createMCPConnection(selectedServer.id);
      await loadData();
      setShowConnectionModal(false);
      setSelectedServer(null);
      onConnectionCreated?.();
      alert(`Connexion réussie à ${selectedServer.name} !`);
    } catch (error: any) {
      alert('Échec de la connexion : ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  // Helper pour obtenir les props du modal API Key
  const getApiKeyModalProps = (provider: string) => {
    const propsMap: Record<string, any> = {
      hubspot: {
        providerName: 'HubSpot',
        brandColor: '#ff7a59',
        description: 'Connect your HubSpot CRM',
        keyLabel: 'HubSpot API Key',
        keyPlaceholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        docsUrl: 'https://developers.hubspot.com/docs/api/overview',
        getKeyUrl: 'https://app.hubspot.com/settings/api-key',
      },
      openai: {
        providerName: 'OpenAI',
        brandColor: '#10a37f',
        description: 'Connect to OpenAI GPT models',
        keyLabel: 'OpenAI API Key',
        keyPlaceholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://platform.openai.com/docs/api-reference',
        getKeyUrl: 'https://platform.openai.com/api-keys',
      },
      anthropic: {
        providerName: 'Anthropic',
        brandColor: '#d97757',
        description: 'Connect to Claude AI models',
        keyLabel: 'Anthropic API Key',
        keyPlaceholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx',
        docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
        getKeyUrl: 'https://console.anthropic.com/settings/keys',
      },
      airtable: {
        providerName: 'Airtable',
        brandColor: '#18bfff',
        description: 'Connect to your Airtable bases',
        keyLabel: 'Airtable Personal Access Token',
        keyPlaceholder: 'pat...',
        docsUrl: 'https://airtable.com/developers/web/api/introduction',
        getKeyUrl: 'https://airtable.com/create/tokens',
      },
      linear: {
        providerName: 'Linear',
        brandColor: '#5e6ad2',
        description: 'Connect to Linear project management',
        keyLabel: 'Linear API Key',
        keyPlaceholder: 'lin_api_...',
        docsUrl: 'https://developers.linear.app/docs',
        getKeyUrl: 'https://linear.app/settings/api',
      },
    };
    return propsMap[provider] || {};
  };

  const handleApiKeyConfigured = async () => {
    if (!selectedServer) return;

    try {
      setConnecting(true);
      // L'API key a été configurée via ApiKeyConfigModal, maintenant créer la connexion
      await api.createMCPConnection(selectedServer.id);
      await loadData();
      setShowApiKeyConfig(false);
      setApiKeyProvider('');
      setSelectedServer(null);
      onConnectionCreated?.();
      alert(`Connexion réussie à ${selectedServer.name} !`);
    } catch (error: any) {
      alert('Échec de la connexion : ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleOAuthConfigured = async () => {
    if (!selectedServer) return;

    try {
      setConnecting(true);
      // L'OAuth a été complété, maintenant créer la connexion MCP
      await api.createMCPConnection(selectedServer.id);
      await loadData();
      setShowGmailConfig(false);
      setShowSlackConfig(false);
      setShowSalesforceConfig(false);
      setShowTeamsConfig(false);
      setSelectedServer(null);
      onConnectionCreated?.();
      alert(`Connexion réussie à ${selectedServer.name} !`);
    } catch (error: any) {
      alert('Échec de la connexion : ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (server: any) => {
    const connection = connections.find((conn) => conn.server_id === server.id);
    if (!connection) return;

    if (!confirm(`Déconnecter ${server.name} ?`)) return;

    try {
      await api.deleteMCPConnection(connection.id);
      await loadData();
      onConnectionCreated?.();
    } catch (error: any) {
      alert('Échec de la déconnexion : ' + error.message);
    }
  };

  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      searchQuery === '' ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || server.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Debug logging
  React.useEffect(() => {
    console.log('[MCPMarketplace] Filtering:', {
      totalServers: servers.length,
      filteredServers: filteredServers.length,
      searchQuery,
      selectedCategory,
      serversList: servers.map(s => ({ id: s.id, name: s.name, category: s.category }))
    });
  }, [servers, filteredServers, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[85vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Marketplace MCP</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Parcourez et connectez des outils pour améliorer votre assistant IA
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des outils..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                  {category.serverCount !== undefined && (
                    <span className="ml-1 opacity-75">({category.serverCount})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-600">Aucun outil trouvé</p>
                <p className="text-sm text-gray-400 mt-1">
                  Essayez d'ajuster votre recherche ou vos filtres
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServers.map((server) => (
                  <MCPServerCard
                    key={server.id}
                    server={server}
                    isConnected={isServerConnected(server.id)}
                    onConnect={() => handleConnect(server)}
                    onDisconnect={() => handleDisconnect(server)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                {filteredServers.length} outil{filteredServers.length !== 1 ? 's' : ''} disponible{filteredServers.length !== 1 ? 's' : ''} •{' '}
                {connections.length} connecté{connections.length !== 1 ? 's' : ''}
              </div>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:text-sky-700"
              >
                En savoir plus sur MCP →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Confirmation Modal */}
      {showConnectionModal && selectedServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Se connecter à {selectedServer.name} ?</h3>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl">{selectedServer.icon}</div>
                <div>
                  <div className="font-medium text-gray-900">{selectedServer.name}</div>
                  <div className="text-sm text-gray-600">{selectedServer.description}</div>
                </div>
              </div>

              {selectedServer.requires_auth && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      {selectedServer.auth_type === 'api_key' ? (
                        <>Cet outil nécessite une clé API. Il vous sera demandé de la saisir à l'étape suivante.</>
                      ) : (
                        <>Cet outil nécessite une authentification via {selectedServer.auth_type || 'OAuth2'}. Vous serez redirigé pour autoriser l'accès.</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedServer.setup_instructions && (
                <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="text-sm font-medium text-orange-900 mb-1">Instructions de Configuration</div>
                  <div className="text-sm text-sky-700">{selectedServer.setup_instructions}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setSelectedServer(null);
                }}
                disabled={connecting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmConnect}
                disabled={connecting}
                className="flex-1 px-4 py-2 bg-sky-600 text-white font-medium rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {connecting ? 'Connexion...' : 'Connecter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Configuration Modal */}
      {apiKeyProvider && selectedServer && (
        <ApiKeyConfigModal
          isOpen={showApiKeyConfig}
          onClose={() => {
            setShowApiKeyConfig(false);
            setApiKeyProvider('');
            setSelectedServer(null);
          }}
          onConfigured={handleApiKeyConfigured}
          provider={apiKeyProvider}
          {...getApiKeyModalProps(apiKeyProvider)}
        />
      )}

      {/* OAuth Configuration Modals */}
      {selectedServer && selectedServer.server_key === 'gmail' && (
        <GmailConfigModal
          isOpen={showGmailConfig}
          onClose={() => {
            setShowGmailConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
        />
      )}

      {selectedServer && selectedServer.server_key === 'gdrive' && (
        <GmailConfigModal
          isOpen={showGmailConfig}
          onClose={() => {
            setShowGmailConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
          scope="drive"
        />
      )}

      {selectedServer && selectedServer.server_key === 'gsheets' && (
        <GmailConfigModal
          isOpen={showGmailConfig}
          onClose={() => {
            setShowGmailConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
          scope="sheets"
        />
      )}

      {selectedServer && selectedServer.server_key === 'slack' && (
        <SlackConfigModal
          isOpen={showSlackConfig}
          onClose={() => {
            setShowSlackConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
        />
      )}

      {selectedServer && selectedServer.server_key === 'salesforce' && (
        <SalesforceConfigModal
          isOpen={showSalesforceConfig}
          onClose={() => {
            setShowSalesforceConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
        />
      )}

      {selectedServer && selectedServer.server_key === 'teams' && (
        <TeamsConfigModal
          isOpen={showTeamsConfig}
          onClose={() => {
            setShowTeamsConfig(false);
            setSelectedServer(null);
          }}
          onConfigured={handleOAuthConfigured}
        />
      )}
    </>
  );
};
