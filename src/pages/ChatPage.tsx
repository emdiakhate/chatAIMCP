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
import { UserProfile } from '../components/UserProfile';
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
  const { logout, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showMCPPanel, setShowMCPPanel] = useState(false);
  const [showMCPMarketplace, setShowMCPMarketplace] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
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
    let conversation = currentConversation;

    // Si pas de conversation, en créer une nouvelle
    if (!conversation) {
      try {
        const { conversation: newConv } = await api.createConversation('Nouvelle Conversation');
        setConversations([newConv, ...conversations]);
        setCurrentConversation(newConv);
        conversation = newConv;
        setMessages([]);
      } catch (error: any) {
        console.error('Failed to create conversation:', error);
        alert(error.message || 'Échec de la création de la conversation');
        return;
      }
    }

    // Ajouter le message utilisateur immédiatement
    const userMessage: Message = {
      id: Date.now(), // ID temporaire
      role: 'user',
      content: content,
      created_at: new Date().toISOString(),
    };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setSending(true);

    // Ajouter un message assistant vide pour le streaming
    const assistantMessage: Message = {
      id: Date.now() + 1, // ID temporaire
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages([...currentMessages, assistantMessage]);

    try {
      // Utiliser le streaming pour une meilleure expérience utilisateur
      api.sendMessageStream(
        conversation.id,
        content,
        // onToken: ajouter chaque token au message assistant
        (token: string) => {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content += token;
            }
            return updatedMessages;
          });
        },
        // onComplete: mettre à jour avec l'ID réel et le contenu complet
        (fullContent: string, messageId: number) => {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.id = messageId;
              lastMessage.content = fullContent;
            }
            return updatedMessages;
          });
          setSending(false);
          loadConversations();
        },
        // onError: gérer les erreurs
        (error: Error) => {
          console.error('Failed to send message:', error);
          // Retirer le message assistant temporaire en cas d'erreur
          setMessages(currentMessages);
          alert(error.message || 'Échec de l\'envoi du message');
          setSending(false);
        },
        // onUserMessage: mettre à jour l'ID du message utilisateur
        (messageId: number) => {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const userMsg = updatedMessages.find((m) => m.role === 'user' && m.id === userMessage.id);
            if (userMsg) {
              userMsg.id = messageId;
            }
            return updatedMessages;
          });
        }
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      // En cas d'erreur, retirer les messages temporaires
      setMessages(messages);
      alert(error.message || 'Échec de l\'envoi du message');
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={loadConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onShowProfile={() => setShowUserProfile(true)}
        onLogout={logout}
        userEmail={user?.email || ''}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader />

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
                  Commencer une nouvelle conversation
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Posez-moi n'importe quelle question ! Je peux utiliser vos outils MCP connectés pour fournir des réponses contextuelles.
                </p>
                <button
                  onClick={() => setShowMCPPanel(true)}
                  className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Gérer Mes Outils
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

      {showUserProfile && (
        <UserProfile
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          userEmail={user?.email || ''}
        />
      )}
    </div>
  );
};
