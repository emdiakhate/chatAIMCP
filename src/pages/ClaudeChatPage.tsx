import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClaudeLayout } from '../components/claude-ui/ClaudeLayout';
import { ChatArea } from '../components/claude-ui/ChatArea';
import { IntegrationsModal } from '../components/IntegrationsModal';
import { MCPToolsPanel } from '../components/MCPToolsPanel';
import { MCPMarketplace } from '../components/MCPMarketplace';

export const ClaudeChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showMCPPanel, setShowMCPPanel] = useState(false);
  const [showMCPMarketplace, setShowMCPMarketplace] = useState(false);

  const currentConversationId = conversationId ? parseInt(conversationId) : null;

  // Écouter les événements pour ouvrir les modals
  React.useEffect(() => {
    const handleOpenIntegrations = () => setShowIntegrations(true);
    const handleOpenMCPTools = () => setShowMCPPanel(true);
    const handleOpenMCPMarketplace = () => setShowMCPMarketplace(true);

    window.addEventListener('openIntegrations', handleOpenIntegrations);
    window.addEventListener('openMCPTools', handleOpenMCPTools);
    window.addEventListener('openMCPMarketplace', handleOpenMCPMarketplace);

    return () => {
      window.removeEventListener('openIntegrations', handleOpenIntegrations);
      window.removeEventListener('openMCPTools', handleOpenMCPTools);
      window.removeEventListener('openMCPMarketplace', handleOpenMCPMarketplace);
    };
  }, []);

  return (
    <>
      <ClaudeLayout>
        {(toggleSidebar) => (
          <ChatArea
            conversationId={currentConversationId}
            onToggleSidebar={toggleSidebar}
            onOpenIntegrations={() => setShowIntegrations(true)}
            onOpenMCPTools={() => setShowMCPPanel(true)}
            onOpenMCPMarketplace={() => setShowMCPMarketplace(true)}
          />
        )}
      </ClaudeLayout>

      {/* Modals - Keep existing functionality */}
      {showIntegrations && (
        <IntegrationsModal onClose={() => setShowIntegrations(false)} />
      )}

      {showMCPPanel && (
        <MCPToolsPanel
          isOpen={showMCPPanel}
          onClose={() => setShowMCPPanel(false)}
          onOpenMarketplace={() => {
            setShowMCPPanel(false);
            setShowMCPMarketplace(true);
          }}
        />
      )}

      {showMCPMarketplace && (
        <MCPMarketplace
          isOpen={showMCPMarketplace}
          onClose={() => setShowMCPMarketplace(false)}
          onConnectionCreated={() => {
            // Refresh connections when coming back to tools panel
          }}
        />
      )}
    </>
  );
};
