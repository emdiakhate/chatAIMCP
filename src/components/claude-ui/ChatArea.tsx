import React, { useEffect, useState, useRef } from 'react';
import { Menu } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
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
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversationId,
  onToggleSidebar,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('New Chat');
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
      const { conversation, messages: msgs } = await api.getConversation(conversationId);
      setMessages(msgs || []);
      setConversationTitle(conversation?.title || 'New Chat');
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !conversationId) return;

    setIsLoading(true);

    try {
      const response = await api.sendMessage(conversationId, content);
      const updatedMessages = response.messages || [];
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-sm font-medium text-gray-900 truncate">
          {conversationTitle}
        </h1>
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
              {isLoading && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-2 h-2 bg-[#CC785C] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#CC785C] rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-[#CC785C] rounded-full animate-bounce delay-200" />
                </div>
              )}
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
          />
        </div>
      </div>
    </div>
  );
};
