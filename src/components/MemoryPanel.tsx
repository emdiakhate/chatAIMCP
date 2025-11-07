import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Search, Calendar, Tag, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Memory {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
  metadata?: Record<string, any>;
}

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState('');
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      // Cette API devrait appeler le serveur Memory MCP via recall_memory
      const response = await api.getMCPMemories();
      setMemories(response.memories || []);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;

    try {
      const tags = newTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      // Appeler le serveur Memory MCP via store_memory
      await api.createMCPMemory({
        content: newMemory,
        tags,
      });

      setNewMemory('');
      setNewTags('');
      setShowAddModal(false);
      await loadMemories();
    } catch (error: any) {
      alert('Failed to add memory: ' + error.message);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory?')) return;

    try {
      await api.deleteMCPMemory(memoryId);
      await loadMemories();
    } catch (error: any) {
      alert('Failed to delete memory: ' + error.message);
    }
  };

  const filteredMemories = memories.filter(memory => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      memory.content.toLowerCase().includes(query) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[85vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Memory Manager</h2>
                  <p className="text-sm text-gray-600">
                    Manage long-term context and knowledge
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Add */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Memory
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No memories found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery
                    ? 'Try a different search query'
                    : 'Add your first memory to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 mb-3 whitespace-pre-wrap">
                          {memory.content}
                        </p>

                        {/* Tags */}
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {memory.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(memory.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                {filteredMemories.length} memor{filteredMemories.length !== 1 ? 'ies' : 'y'}
                {searchQuery && ` (filtered)`}
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Memories persist across conversations</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add New Memory</h3>
              <p className="text-sm text-gray-600 mt-1">
                Store important information for future conversations
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memory Content *
                </label>
                <textarea
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="E.g., The user prefers Python over JavaScript for backend development"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (optional)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Comma-separated: preferences, coding, backend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use tags to organize and find memories later
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMemory('');
                  setNewTags('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!newMemory.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
