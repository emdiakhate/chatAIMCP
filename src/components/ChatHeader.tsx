import React from 'react';
import { MessageSquare } from 'lucide-react';

export const ChatHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center">
        <div className="bg-sky-500 p-2 rounded-lg mr-3">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ChatAI Pro</h1>
          <p className="text-sm text-gray-600">Assistant IA avec Intégrations Google</p>
        </div>
      </div>
    </header>
  );
};
