import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Search, Settings, LogOut } from 'lucide-react';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
  created_at: string;
}

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      setConversations(response);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await api.createConversation();
      setCurrentConversationId(response.id);
      navigate(`/chat/${response.id}`);
      await loadConversations();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const groupConversationsByDate = () => {
    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.updated_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) groups['Today'].push(conv);
      else if (diffDays === 1) groups['Yesterday'].push(conv);
      else if (diffDays < 7) groups['Previous 7 Days'].push(conv);
      else if (diffDays < 30) groups['Previous 30 Days'].push(conv);
      else groups['Older'].push(conv);
    });

    return groups;
  };

  const groupedConversations = groupConversationsByDate();

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CC785C] hover:bg-[#B86A4D] text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {Object.entries(groupedConversations).map(([group, convs]) => {
          if (convs.length === 0) return null;

          return (
            <div key={group} className="mb-4">
              <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                {group}
              </h3>
              <div className="space-y-0.5 mt-1">
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setCurrentConversationId(conv.id);
                      navigate(`/chat/${conv.id}`);
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg transition-colors text-left group ${
                      currentConversationId === conv.id
                        ? 'bg-[#F5F5F0]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.title || 'Untitled Chat'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(conv.updated_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
};
