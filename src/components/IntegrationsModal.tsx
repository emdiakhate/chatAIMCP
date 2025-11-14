import React, { useState, useEffect } from 'react';
import { X, Mail, HardDrive, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

interface IntegrationsModalProps {
  onClose: () => void;
}

interface Integration {
  id: number;
  provider: string;
  created_at: string;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ onClose }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { integrations: intgs } = await api.getIntegrations();
      setIntegrations(intgs);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const { authUrl } = await api.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      alert('Failed to connect to Google. Please try again.');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await api.deleteIntegration(provider);
      setIntegrations(integrations.filter(i => i.provider !== provider));
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const isConnected = integrations.some(i => i.provider === 'google');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Integrations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-green-500 p-3 rounded-lg mr-4">
                      <HardDrive className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Google Services</h3>
                      <p className="text-sm text-gray-600">Drive & Gmail</p>
                    </div>
                  </div>
                  {isConnected && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Connect your Google account to search and reference files from Drive and emails from Gmail in your conversations.
                </p>

                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
                  <Mail className="w-4 h-4" />
                  <span>Gmail Read Access</span>
                  <span>•</span>
                  <HardDrive className="w-4 h-4" />
                  <span>Drive Read Access</span>
                </div>

                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect('google')}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg transition"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect Google
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <p className="text-sm text-sky-800">
                  <strong>Privacy:</strong> We only request read-only access. Your data is never stored on our servers and is only used to provide contextual responses.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
