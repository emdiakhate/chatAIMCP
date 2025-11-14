import React, { useEffect, useState, useRef } from 'react';
import { Menu, Settings, Puzzle, Store, Edit2, Check, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInputAdvanced as ChatInput } from './ChatInputAdvanced';
import { api } from '../../lib/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tool_calls?: any[];
}

interface ChatAreaProps {
  conversationId: number | null;
  onToggleSidebar: () => void;
  onOpenIntegrations?: () => void;
  onOpenMCPTools?: () => void;
  onOpenMCPMarketplace?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversationId,
  onToggleSidebar,
  onOpenIntegrations,
  onOpenMCPTools,
  onOpenMCPMarketplace,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('New Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
      setConversationTitle('New Chat');
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const result = await api.getConversation(conversationId);
      const messages = result.messages || [];
      const conversation = result.conversation || {};
      setMessages(Array.isArray(messages) ? messages : []);
      setConversationTitle(conversation.title || 'New Chat');
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async (content: string, attachedFiles?: File[]) => {
    if (!content.trim() || !conversationId) return;

    // Afficher immédiatement le message utilisateur (optimistic UI)
    const optimisticUserMessage: Message = {
      id: Date.now(), // ID temporaire
      role: 'user',
      content: content.trim() + (attachedFiles && attachedFiles.length > 0 
        ? `\n[${attachedFiles.length} fichier(s) joint(s)]` 
        : ''),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setIsLoading(true);

    // Créer un message assistant temporaire pour le streaming
    const streamingMessageId = Date.now() + 1;
    const streamingMessage: Message = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, streamingMessage]);

    try {
      // Utiliser le streaming
      api.sendMessageStream(
        conversationId,
        content,
        // onToken: appelé pour chaque token reçu
        (token: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId && msg.role === 'assistant'
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
          // Scroll automatique pendant le streaming
          setTimeout(() => scrollToBottom(), 0);
        },
        // onComplete: appelé quand le streaming est terminé
        (fullContent: string, messageId: number) => {
          // Mettre à jour le message avec l'ID réel et le contenu complet
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === streamingMessageId && msg.role === 'assistant'
                ? { ...msg, id: messageId, content: fullContent }
                : msg
            );
            
            // Mettre à jour le titre si c'est la première réponse (sans recharger tous les messages)
            // Compter seulement les messages utilisateur et assistant (pas les messages système)
            const userAndAssistantMessages = updated.filter(m => m.role === 'user' || m.role === 'assistant');
            if (userAndAssistantMessages.length <= 2) {
              const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
              setConversationTitle(title);
              // Mettre à jour le titre dans la DB sans recharger les messages
              api.updateConversation(conversationId, title).catch(console.error);
            }
            
            return updated;
          });
          setIsLoading(false);
        },
        // onError: appelé en cas d'erreur
        (error: Error) => {
          console.error('Failed to send message:', error);
          // Retirer les messages optimistes en cas d'erreur
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUserMessage.id && m.id !== streamingMessageId)
          );
          setIsLoading(false);
          alert('Failed to send message: ' + error.message);
        },
        // onUserMessage: appelé quand le message utilisateur est enregistré (optionnel)
        (userMessageId: number) => {
          // Mettre à jour l'ID du message utilisateur avec l'ID réel de la DB
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === optimisticUserMessage.id && msg.role === 'user'
                ? { ...msg, id: userMessageId }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Retirer les messages optimistes en cas d'erreur
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticUserMessage.id && m.id !== streamingMessageId)
      );
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      alert(errorMessage);
    }
  };

  const handleStartEditTitle = () => {
    if (!conversationId) return;
    setIsEditingTitle(true);
    setEditingTitle(conversationTitle);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleSaveTitle = async () => {
    if (!conversationId || !editingTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await api.updateConversation(conversationId, editingTitle.trim());
      setConversationTitle(editingTitle.trim());
      setIsEditingTitle(false);
      
      // Déclencher un événement pour mettre à jour la sidebar
      window.dispatchEvent(new CustomEvent('conversationUpdated'));
    } catch (error) {
      console.error('Failed to update conversation title:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename conversation';
      alert(`Failed to rename conversation: ${errorMessage}`);
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  // Écouter les mises à jour de conversation depuis la sidebar
  useEffect(() => {
    const handleConversationUpdate = () => {
      if (conversationId) {
        loadMessages();
      }
    };

    window.addEventListener('conversationUpdated', handleConversationUpdate);
    return () => {
      window.removeEventListener('conversationUpdated', handleConversationUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                ref={titleInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="flex-1 text-sm font-medium text-gray-900 bg-white border border-[#CC785C] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#CC785C] min-w-0"
                placeholder="Conversation title"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                title="Save"
              >
                <Check className="w-4 h-4 text-emerald-600" />
              </button>
              <button
                onClick={handleCancelEditTitle}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0 group">
              <h1 
                className="text-sm font-medium text-gray-900 truncate cursor-pointer flex-1"
                onClick={conversationId ? handleStartEditTitle : undefined}
                title={conversationId ? "Click to rename" : undefined}
              >
                {conversationTitle}
              </h1>
              {conversationId && (
                <button
                  onClick={handleStartEditTitle}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all flex-shrink-0"
                  title="Rename"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenMCPTools && (
            <button
              onClick={onOpenMCPTools}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="MCP Tools"
              title="MCP Tools"
            >
              <Puzzle className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {onOpenMCPMarketplace && (
            <button
              onClick={onOpenMCPMarketplace}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="MCP Marketplace"
              title="Add Tool"
            >
              <Store className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {onOpenIntegrations && (
            <button
              onClick={onOpenIntegrations}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-medium text-gray-900 mb-2">
                  Comment puis-je vous aider aujourd'hui ?
                </h2>
                <p className="text-sm text-gray-500">
                  Posez une question ou commencez une conversation
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <ChatInput
            onSend={handleSendMessage}
            disabled={!conversationId || isLoading}
            placeholder={
              conversationId
                ? 'Envoyer un message...'
                : 'Créez une nouvelle conversation pour commencer'
            }
            conversationId={conversationId}
          />
        </div>
      </div>
    </div>
  );
};
