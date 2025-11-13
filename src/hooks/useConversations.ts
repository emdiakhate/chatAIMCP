import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import api from '../lib/api';

/**
 * Hook pour gérer les conversations
 * Encapsule toute la logique de conversations
 */
export function useConversations() {
  const {
    conversations,
    currentConversation,
    isLoadingConversations,
    setConversations,
    setCurrentConversation,
    addConversation,
    updateConversation,
    deleteConversation,
    setLoadingConversations,
    filteredConversations,
  } = useAppStore();

  /**
   * Charger toutes les conversations de l'utilisateur
   */
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await api.getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    } finally {
      setLoadingConversations(false);
    }
  }, [setConversations, setLoadingConversations]);

  /**
   * Charger une conversation spécifique avec ses messages
   */
  const loadConversation = useCallback(
    async (id: number) => {
      try {
        const data = await api.getConversation(id);
        setCurrentConversation(data.conversation);
        return data;
      } catch (error) {
        console.error('Error loading conversation:', error);
        throw error;
      }
    },
    [setCurrentConversation]
  );

  /**
   * Créer une nouvelle conversation
   */
  const createConversation = useCallback(
    async (title?: string) => {
      try {
        const data = await api.createConversation(title);
        addConversation(data.conversation);
        setCurrentConversation(data.conversation);
        return data.conversation;
      } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }
    },
    [addConversation, setCurrentConversation]
  );

  /**
   * Mettre à jour le titre d'une conversation
   */
  const updateConversationTitle = useCallback(
    async (id: number, title: string) => {
      try {
        await api.updateConversation(id, title);
        updateConversation(id, { title });
      } catch (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }
    },
    [updateConversation]
  );

  /**
   * Supprimer une conversation
   */
  const removeConversation = useCallback(
    async (id: number) => {
      try {
        await api.deleteConversation(id);
        deleteConversation(id);
      } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
      }
    },
    [deleteConversation]
  );

  return {
    // State
    conversations,
    currentConversation,
    isLoading: isLoadingConversations,
    filteredConversations: filteredConversations(),

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    updateConversationTitle,
    removeConversation,
    setCurrentConversation,
  };
}
