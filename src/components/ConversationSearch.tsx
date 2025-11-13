import React from 'react';
import { Search, X } from 'lucide-react';

interface ConversationSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const ConversationSearch: React.FC<ConversationSearchProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="relative px-2 mb-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher..."
          className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
