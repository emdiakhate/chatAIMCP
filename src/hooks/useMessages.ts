import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import api from '../lib/api';
import { Message } from '../pages/ChatPage';

/**
 * Hook pour gérer les messages
 * Encapsule toute la logique de messages et chat
 */
export function useMessages() {
  const {
    messages,
    currentConversation,
    isLoadingMessages,
    setMessages,
    addMessage,
    updateMessage,
    setLoadingMessages,
  } = useAppStore();

  /**
   * Charger les messages d'une conversation
   */
  const loadMessages = useCallback(
    async (conversationId: number) => {
      try {
        setLoadingMessages(true);
        const data = await api.getConversation(conversationId);
        setMessages(data.messages);
      } catch (error) {
        console.error('Error loading messages:', error);
        throw error;
      } finally {
        setLoadingMessages(false);
      }
    },
    [setMessages, setLoadingMessages]
  );

  /**
   * Envoyer un message (non-streaming)
   */
  const sendMessage = useCallback(
    async (conversationId: number, content: string, files?: File[]) => {
      try {
        // Ajouter le message de l'utilisateur immédiatement
        const userMessage: Partial<Message> = {
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        };
        addMessage(userMessage as Message);

        // Envoyer à l'API
        const data = await api.sendMessage(conversationId, content, files);

        // Ajouter la réponse de l'assistant
        if (data.response) {
          addMessage(data.response);
        }

        return data;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    [addMessage]
  );

  /**
   * Envoyer un message avec streaming
   */
  const sendMessageStream = useCallback(
    async (
      conversationId: number,
      content: string,
      onToken: (token: string) => void,
      onComplete: (fullResponse: string) => void,
      onError: (error: Error) => void
    ) => {
      try {
        // Ajouter le message de l'utilisateur
        const userMessage: Partial<Message> = {
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        };
        addMessage(userMessage as Message);

        // Créer un message temporaire pour l'assistant
        const tempAssistantMessage: Partial<Message> = {
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        };
        const tempId = Date.now();
        addMessage({ ...tempAssistantMessage, id: tempId } as Message);

        let fullResponse = '';

        // Streaming
        await api.sendMessageStream(
          conversationId,
          content,
          (token: string) => {
            fullResponse += token;
            updateMessage(tempId, { content: fullResponse });
            onToken(token);
          },
          (response: string) => {
            onComplete(response);
          },
          onError,
          (userMsg: Message) => {
            // onUserMessage callback
          }
        );
      } catch (error) {
        console.error('Error sending message stream:', error);
        onError(error as Error);
      }
    },
    [addMessage, updateMessage]
  );

  return {
    // State
    messages,
    currentConversation,
    isLoading: isLoadingMessages,

    // Actions
    loadMessages,
    sendMessage,
    sendMessageStream,
    addMessage,
    updateMessage,
  };
}
