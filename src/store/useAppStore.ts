import { create } from 'zustand';
import { Conversation, Message } from '../pages/ChatPage';

interface AppState {
  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // UI State
  isSidebarOpen: boolean;
  searchTerm: string;

  // Actions - Conversations
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: number, updates: Partial<Conversation>) => void;
  deleteConversation: (id: number) => void;

  // Actions - Messages
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: number, updates: Partial<Message>) => void;

  // Actions - Loading
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;

  // Actions - UI
  toggleSidebar: () => void;
  setSearchTerm: (term: string) => void;

  // Computed
  filteredConversations: () => Conversation[];
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSidebarOpen: true,
  searchTerm: '',

  // Actions - Conversations
  setConversations: (conversations) => set({ conversations }),

  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
      currentConversation:
        state.currentConversation?.id === id
          ? { ...state.currentConversation, ...updates }
          : state.currentConversation,
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
      currentConversation:
        state.currentConversation?.id === id ? null : state.currentConversation,
    })),

  // Actions - Messages
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  // Actions - Loading
  setLoadingConversations: (loading) => set({ isLoadingConversations: loading }),

  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  // Actions - UI
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSearchTerm: (term) => set({ searchTerm: term }),

  // Computed
  filteredConversations: () => {
    const { conversations, searchTerm } = get();
    if (!searchTerm) return conversations;

    const lowerTerm = searchTerm.toLowerCase();
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(lowerTerm)
    );
  },
}));
