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
          content: '¡Hola! Soy tu asistente de documentos. Sube archivos y hazme cualquier pregunta sobre su contenido. Puedo ayudarte a encontrar información específica, resumir contenido y responder preguntas basadas en tus documentos.',
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
            content: 'Lo siento, hubo un error procesando tu pregunta. Por favor, intenta de nuevo.',
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
              content: '¡Hola! Soy tu asistente de documentos. Sube archivos y hazme cualquier pregunta sobre su contenido.',
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
              content: '¡Nueva conversación iniciada! ¿En qué puedo ayudarte hoy?',
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
