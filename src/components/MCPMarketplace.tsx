import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MCPServerCard } from './MCPServerCard';
import { X, Search, Loader2 } from 'lucide-react';

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

    try {
      setConnecting(true);
      await api.createMCPConnection(selectedServer.id);
      await loadData();
      setShowConnectionModal(false);
      setSelectedServer(null);
      onConnectionCreated?.();
      alert(`Successfully connected to ${selectedServer.name}!`);
    } catch (error: any) {
      alert('Failed to connect: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (server: any) => {
    const connection = connections.find((conn) => conn.server_id === server.id);
    if (!connection) return;

    if (!confirm(`Disconnect from ${server.name}?`)) return;

    try {
      await api.deleteMCPConnection(connection.id);
      await loadData();
      onConnectionCreated?.();
    } catch (error: any) {
      alert('Failed to disconnect: ' + error.message);
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
                <h2 className="text-2xl font-bold text-gray-900">MCP Marketplace</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Browse and connect tools to enhance your AI assistant
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
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      ? 'bg-blue-600 text-white'
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
                <p className="text-gray-600">No tools found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your search or filters
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
                {filteredServers.length} tool{filteredServers.length !== 1 ? 's' : ''} available •{' '}
                {connections.length} connected
              </div>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                Learn about MCP →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Confirmation Modal */}
      {showConnectionModal && selectedServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Connect to {selectedServer.name}?</h3>

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
                      This tool requires authentication via {selectedServer.auth_type || 'OAuth2'}.
                      You'll be redirected to authorize access.
                    </div>
                  </div>
                </div>
              )}

              {selectedServer.setup_instructions && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-1">Setup Instructions</div>
                  <div className="text-sm text-blue-700">{selectedServer.setup_instructions}</div>
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
                Cancel
              </button>
              <button
                onClick={handleConfirmConnect}
                disabled={connecting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
