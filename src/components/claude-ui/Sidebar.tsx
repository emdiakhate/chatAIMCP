import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Plus, Settings, LogOut, Edit2, Check, X, Boxes } from 'lucide-react';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  
  // Détecter la conversation active depuis l'URL
  const currentConversationId = conversationId ? parseInt(conversationId) : null;

  // S'assurer que conversations est toujours un tableau
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      // S'assurer que response est un tableau
      setConversations(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]); // En cas d'erreur, initialiser avec un tableau vide
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await api.createConversation();
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

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title || '');
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleSaveEdit = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await api.updateConversation(id, editingTitle.trim());
      await loadConversations();
      setEditingId(null);
      setEditingTitle('');
      
      // Déclencher un événement pour mettre à jour ChatArea
      window.dispatchEvent(new CustomEvent('conversationUpdated'));
    } catch (error) {
      console.error('Failed to update conversation:', error);
      alert('Failed to rename conversation');
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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

    // Utiliser safeConversations qui est toujours un tableau
    safeConversations.forEach((conv) => {
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
                  <div
                    key={conv.id}
                    className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg transition-colors group ${
                      currentConversationId === conv.id
                        ? 'bg-[#F5F5F0]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, conv.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-sm font-medium text-gray-900 bg-white border border-[#CC785C] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#CC785C]"
                            placeholder="Conversation title"
                          />
                          <button
                            onClick={(e) => handleSaveEdit(conv.id, e)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            onClick={(e) => handleCancelEdit(e)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                navigate(`/chat/${conv.id}`);
                              }}
                              className="flex-1 text-left min-w-0"
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conv.title || 'Untitled Chat'}
                              </p>
                            </button>
                            <button
                              onClick={(e) => handleStartEdit(conv, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all flex-shrink-0"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(conv.updated_at)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {safeConversations.length === 0 && (
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
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openMCPMarketplace'));
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#CC785C] hover:bg-[#FFF8F5] rounded-lg transition-colors"
        >
          <Boxes className="w-4 h-4" />
          MCP Tools
        </button>
        <div className="my-2 border-t border-gray-200"></div>
        <button
          onClick={() => {
            // Ouvrir les intégrations via un événement personnalisé
            window.dispatchEvent(new CustomEvent('openIntegrations'));
          }}
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
