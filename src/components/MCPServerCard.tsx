import React from 'react';

interface MCPServerCardProps {
  server: {
    id: number;
    server_key: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    status?: 'available' | 'beta' | 'coming_soon';
    is_public: boolean;
    requires_auth: boolean;
    auth_type?: string;
    capabilities?: string[];
    is_custom?: boolean;
  };
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
}

export const MCPServerCard: React.FC<MCPServerCardProps> = ({
  server,
  isConnected = false,
  onConnect,
  onDisconnect,
  onConfigure,
}) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      storage: 'bg-blue-100 text-blue-700',
      communication: 'bg-green-100 text-green-700',
      productivity: 'bg-yellow-100 text-yellow-700',
      development: 'bg-purple-100 text-purple-700',
      database: 'bg-red-100 text-red-700',
      business: 'bg-pink-100 text-pink-700',
      search: 'bg-indigo-100 text-indigo-700',
      utility: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status?: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      available: { label: 'Available', color: 'bg-green-100 text-green-700 border border-green-200' },
      beta: { label: 'Beta', color: 'bg-orange-100 text-orange-700 border border-orange-200' },
      coming_soon: { label: 'Coming Soon', color: 'bg-gray-100 text-gray-600 border border-gray-200' },
    };
    return badges[status || 'available'];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{server.icon}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{server.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(server.category)}`}>
                {server.category}
              </span>
              {server.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(server.status).color}`}>
                  {getStatusBadge(server.status).label}
                </span>
              )}
              {server.is_custom && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Custom
                </span>
              )}
            </div>
          </div>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">Connected</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{server.description}</p>

      {server.capabilities && server.capabilities.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {server.capabilities.slice(0, 3).map((capability) => (
              <span
                key={capability}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {capability}
              </span>
            ))}
            {server.capabilities.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                +{server.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {server.requires_auth && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Requires {server.auth_type || 'authentication'}</span>
        </div>
      )}

      <div className="flex gap-2">
        {!isConnected ? (
          server.status === 'coming_soon' ? (
            <button
              disabled
              className="flex-1 px-3 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-md cursor-not-allowed"
              title="This tool is not yet available"
            >
              Coming Soon
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          )
        ) : (
          <>
            <button
              onClick={onConfigure}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Configure
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};
