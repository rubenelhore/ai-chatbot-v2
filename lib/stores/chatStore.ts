import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    documentId: string;
    chunkIndex: number;
    score: number;
    text?: string;
  }>;
  isError?: boolean;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  selectedDocuments: string[];
  conversationId: string | null;

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  sendQuery: (query: string) => Promise<void>;
  setSelectedDocuments: (docs: string[]) => void;
  clearMessages: () => void;
  startNewConversation: () => void;
  removeMessage: (messageId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: 'welcome',
          type: 'assistant',
          content: 'Hello! I\'m your document assistant. Upload files and ask me any questions about their content. I can help you find specific information, summarize content, and answer questions based on your documents.',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      selectedDocuments: [],
      conversationId: null,

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      sendQuery: async (query: string) => {
        const { selectedDocuments, addMessage, conversationId } = get();

        if (selectedDocuments.length === 0) {
          addMessage({
            type: 'assistant',
            content: 'Por favor, selecciona al menos un documento antes de hacer una pregunta.',
            isError: true,
          });
          return;
        }

        if (!query.trim()) {
          return;
        }

        addMessage({ type: 'user', content: query });
        set({ isLoading: true });

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: query.trim(),
              documentIds: selectedDocuments,
              conversationId: conversationId || undefined,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to send query');
          }

          const data = await response.json();

          addMessage({
            type: 'assistant',
            content: data.response,
            sources: data.sources,
          });

          if (!conversationId) {
            set({ conversationId: data.chatId });
          }
        } catch (error) {
          console.error('Error sending query:', error);
          addMessage({
            type: 'assistant',
            content: 'Sorry, there was an error processing your question. Please try again.',
            isError: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedDocuments: (docs) => {
        set({ selectedDocuments: docs });
      },

      clearMessages: () => {
        set({
          messages: [
            {
              id: 'welcome',
              type: 'assistant',
              content: 'Hello! I\'m your document assistant. Upload files and ask me any questions about their content.',
              timestamp: new Date(),
            },
          ],
        });
      },

      startNewConversation: () => {
        set({
          conversationId: null,
          messages: [
            {
              id: 'welcome',
              type: 'assistant',
              content: 'New conversation started! How can I help you today?',
              timestamp: new Date(),
            },
          ],
        });
      },

      removeMessage: (messageId) => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== messageId),
        }));
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        messages: state.messages,
        conversationId: state.conversationId,
      }),
    }
  )
);
