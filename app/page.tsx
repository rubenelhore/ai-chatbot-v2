'use client';

import { useUser } from '@auth0/nextjs-auth0';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useChatStore } from '@/lib/stores/chatStore';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function Home() {
  const { user, isLoading: authLoading } = useUser();
  const {
    documents,
    isLoading: docsLoading,
    uploadDocument,
    isUploading,
    deleteDocument,
    getReadyDocuments,
  } = useDocuments();

  const {
    messages,
    isLoading: chatLoading,
    selectedDocuments,
    setSelectedDocuments,
    sendQuery,
  } = useChatStore();

  const [query, setQuery] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        await uploadDocument(file);
        toast.success(`${file.name} subido exitosamente`);
      } catch (error) {
        toast.error('Error al subir el archivo');
      }
    },
    [uploadDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || chatLoading) return;

    await sendQuery(query);
    setQuery('');
  };

  const toggleDocumentSelection = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));
    } else {
      setSelectedDocuments([...selectedDocuments, docId]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-4">AI Document Chat</h1>
          <p className="text-gray-300 mb-6">
            Chatea con tus documentos usando IA. Powered by OpenAI, PostgreSQL y Vercel.
          </p>
          <a
            href="/auth/login"
            className="block w-full bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
          >
            Iniciar sesión con Auth0
          </a>
        </div>
      </div>
    );
  }

  const readyDocs = getReadyDocuments();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">AI Document Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">{user.email}</span>
            <a
              href="/auth/logout"
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              Cerrar sesión
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-80px)]">
        {/* Documents Sidebar */}
        <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-4">Documentos</h2>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors ${
              isDragActive
                ? 'border-purple-400 bg-purple-500/20'
                : 'border-gray-400 hover:border-purple-400'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-gray-300">
              {isUploading
                ? 'Subiendo...'
                : 'Arrastra un archivo o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-400 mt-2">PDF, DOCX, TXT (max 10MB)</p>
          </div>

          {/* Documents List */}
          {docsLoading ? (
            <p className="text-gray-400">Cargando documentos...</p>
          ) : (
            <div className="space-y-2">
              {readyDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDocuments.includes(doc.id)
                      ? 'bg-purple-500/30 border border-purple-400'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                  onClick={() => toggleDocumentSelection(doc.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">
                        {Math.round(doc.size / 1024)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {documents.some((d) => d.status === 'processing' || d.status === 'uploading') && (
            <p className="text-yellow-400 text-sm mt-4">Procesando documentos...</p>
          )}
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-purple-500 text-white'
                      : message.isError
                      ? 'bg-red-500/20 text-red-200'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs opacity-70">
                        Fuentes: {message.sources.length} chunks encontrados
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/20 text-white p-4 rounded-lg">
                  <p>Pensando...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 bg-white/10 text-white placeholder-gray-400 px-4 py-3 rounded-lg border border-white/20 focus:outline-none focus:border-purple-400"
                disabled={chatLoading || selectedDocuments.length === 0}
              />
              <button
                type="submit"
                disabled={chatLoading || !query.trim() || selectedDocuments.length === 0}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enviar
              </button>
            </div>
            {selectedDocuments.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Selecciona al menos un documento para empezar a chatear
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
