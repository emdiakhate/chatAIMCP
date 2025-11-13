import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Conversation, Message } from '../pages/ChatPage';
import {
  exportConversationToMarkdown,
  exportConversationToJSON,
} from '../utils/exportConversation';

interface ExportButtonProps {
  conversation: Conversation | null;
  messages: Message[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({ conversation, messages }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!conversation || messages.length === 0) {
    return null;
  }

  const handleExportMarkdown = () => {
    exportConversationToMarkdown(conversation, messages);
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    exportConversationToJSON(conversation, messages);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        title="Exporter la conversation"
      >
        <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <button
              onClick={handleExportMarkdown}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition text-gray-900 dark:text-white"
            >
              📄 Exporter en Markdown
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition text-gray-900 dark:text-white"
            >
              📦 Exporter en JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
};
