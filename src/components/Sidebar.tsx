import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, LogOut, Boxes } from 'lucide-react';
import { Conversation } from '../pages/ChatPage';
import { UserProfileButton } from './UserProfileButton';

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  onShowIntegrations: () => void;
  onShowMCPPanel?: () => void;
  onShowProfile: () => void;
  onLogout: () => void;
  userEmail: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onShowIntegrations,
  onShowMCPPanel,
  onShowProfile,
  onLogout,
  userEmail,
}) => {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-center p-3 rounded-lg cursor-pointer transition ${
                currentConversation?.id === conversation.id
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conversation.title}</p>
                {conversation.first_message && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conversation.first_message}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        {/* User Profile Button */}
        <UserProfileButton userEmail={userEmail} onClick={onShowProfile} />

        {onShowMCPPanel && (
          <button
            onClick={onShowMCPPanel}
            className="w-full flex items-center justify-center px-4 py-2 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition font-medium"
          >
            <Boxes className="w-4 h-4 mr-2" />
            Mes Outils
          </button>
        )}
        <button
          onClick={onShowIntegrations}
          className="w-full flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <Settings className="w-4 h-4 mr-2" />
          Intégrations
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};
