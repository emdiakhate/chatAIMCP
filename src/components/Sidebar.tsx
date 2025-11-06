import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, LogOut, Boxes } from 'lucide-react';
import { Conversation } from '../pages/ChatPage';

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  onShowIntegrations: () => void;
  onShowMCPPanel?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onShowIntegrations,
  onShowMCPPanel,
  onLogout,
}) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-center p-3 rounded-lg cursor-pointer transition ${
                currentConversation?.id === conversation.id
                  ? 'bg-sky-50 text-sky-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conversation.title}</p>
                {conversation.first_message && (
                  <p className="text-xs text-gray-500 truncate">
                    {conversation.first_message}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-100 rounded transition"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 space-y-2">
        {onShowMCPPanel && (
          <button
            onClick={onShowMCPPanel}
            className="w-full flex items-center justify-center px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium"
          >
            <Boxes className="w-4 h-4 mr-2" />
            My Tools
          </button>
        )}
        <button
          onClick={onShowIntegrations}
          className="w-full flex items-center justify-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <Settings className="w-4 h-4 mr-2" />
          Integrations
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};
