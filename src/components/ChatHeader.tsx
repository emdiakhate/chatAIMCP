import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const ChatHeader: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-orange-500 p-2 rounded-lg mr-3">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ChatAI Pro</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Assistant IA avec Intégrations Google</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
};
