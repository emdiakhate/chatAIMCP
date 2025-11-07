import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Sidebar } from '../components/Sidebar';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { IntegrationsModal } from '../components/IntegrationsModal';
import { MCPToolsPanel } from '../components/MCPToolsPanel';
import { MCPMarketplace } from '../components/MCPMarketplace';
import { Loader2 } from 'lucide-react';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  first_message?: string;
}

export interface Source {
  title: string;
  url: string;
  type: 'drive' | 'gmail';
  mimeType?: string;
  from?: string;
  date?: string;
}

export const ChatPage: React.FC = () => {
  const { logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showMCPPanel, setShowMCPPanel] = useState(false);
  const [showMCPMarketplace, setShowMCPMarketplace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const { conversations: convs } = await api.getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id: number) => {
    setLoading(true);
    try {
      const { conversation, messages: msgs } = await api.getConversation(id);
      setCurrentConversation(conversation);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const { conversation } = await api.createConversation('New Conversation');
      setConversations([conversation, ...conversations]);
      setCurrentConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await api.deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentConversation) {
      await createNewConversation();
      return;
    }

    setSending(true);
    try {
      const response = await api.sendMessage(currentConversation.id, content);
      const updatedMessages = response.messages || [];
      setMessages(updatedMessages);
      await loadConversations();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      alert(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={loadConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onShowIntegrations={() => setShowIntegrations(true)}
        onShowMCPPanel={() => setShowMCPPanel(true)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader />

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Start a new conversation
                </h2>
                <p className="text-gray-600 mb-6">
                  Ask me anything! I can use your connected MCP tools to provide contextual answers.
                </p>
                <button
                  onClick={() => setShowMCPPanel(true)}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage My Tools
                </button>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSendMessage={sendMessage} disabled={sending} />
      </div>

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
    </div>
  );
};
