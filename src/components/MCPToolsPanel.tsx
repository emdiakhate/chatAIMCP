import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Settings, Loader2 } from 'lucide-react';

interface MCPToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMarketplace: () => void;
}

export const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({
  isOpen,
  onClose,
  onOpenMarketplace,
}) => {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await api.getMCPConnections();
      setConnections(response.connections || []);
    } catch (error: any) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async (connectionId: number) => {
    try {
      setLoadingTools(true);
      const response = await api.getMCPConnectionTools(connectionId);
      setTools(response.tools || []);
    } catch (error: any) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!confirm('Are you sure you want to disconnect this tool?')) return;

    try {
      await api.deleteMCPConnection(connectionId);
      await loadConnections();
      if (selectedConnection?.id === connectionId) {
        setSelectedConnection(null);
        setTools([]);
      }
    } catch (error: any) {
      alert('Failed to disconnect: ' + error.message);
    }
  };

  const handleTestConnection = async (connectionId: number) => {
    try {
      const response = await api.testMCPConnection(connectionId);
      alert('Connection test successful! Tools available: ' + response.tools.length);
    } catch (error: any) {
      alert('Connection test failed: ' + error.message);
    }
  };

  const handleSelectConnection = async (connection: any) => {
    setSelectedConnection(connection);
    await loadTools(connection.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Tools</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your MCP server connections</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Connections List */}
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-4">
              <button
                onClick={onOpenMarketplace}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-4"
              >
                + Add New Tool
              </button>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🔌</div>
                  <p className="text-sm text-gray-500">No tools connected yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add New Tool" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((connection) => (
                    <button
                      key={connection.id}
                      onClick={() => handleSelectConnection(connection)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedConnection?.id === connection.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{connection.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {connection.server_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                connection.status === 'active'
                                  ? 'bg-green-500'
                                  : connection.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`}
                            ></div>
                            <span className="text-xs text-gray-500 capitalize">
                              {connection.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connection Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConnection ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{selectedConnection.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedConnection.server_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedConnection.server_description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            selectedConnection.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : selectedConnection.status === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedConnection.status === 'active'
                                ? 'bg-green-500'
                                : selectedConnection.status === 'error'
                                ? 'bg-red-500'
                                : 'bg-gray-400'
                            }`}
                          ></div>
                          {selectedConnection.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestConnection(selectedConnection.id)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={() => handleDisconnect(selectedConnection.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {selectedConnection.error_message && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-red-600 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium text-red-900">Connection Error</div>
                        <div className="text-sm text-red-700 mt-1">
                          {selectedConnection.error_message}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Tools */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Available Tools</h4>
                  {loadingTools ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : tools.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">No tools available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tools.map((tool: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="font-medium text-gray-900">{tool.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{tool.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedConnection.last_connected && (
                  <div className="mt-6 pt-6 border-t text-xs text-gray-500">
                    Last connected:{' '}
                    {new Date(selectedConnection.last_connected).toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a connection to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
