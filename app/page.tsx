'use client';

import { useUser } from '@auth0/nextjs-auth0';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useChatStore } from '@/lib/stores/chatStore';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function Home() {
  // Build timestamp: 2025-10-08T19:35:00Z
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
    clearMessages,
  } = useChatStore();

  const [query, setQuery] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        await uploadDocument(file);
        toast.success(`${file.name} uploaded successfully`);
      } catch {
        toast.error('Error uploading file');
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
            Chat with your documents using AI. Powered by OpenAI, PostgreSQL and Vercel.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/auth/login"
            className="block w-full bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
          >
            Sign in with Auth0
          </a>
        </div>
      </div>
    );
  }

  const readyDocs = getReadyDocuments();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">AI Document Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.email}</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/auth/logout"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sign out
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Documents Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Documents</h2>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors ${
              isDragActive
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600">
              {isUploading
                ? 'Uploading...'
                : 'Drag a file or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-2">PDF, DOCX, TXT (max 10MB)</p>
          </div>

          {/* Documents List */}
          {docsLoading ? (
            <p className="text-gray-500">Loading documents...</p>
          ) : (
            <div className="space-y-2">
              {readyDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDocuments.includes(doc.id)
                      ? 'bg-purple-50 border border-purple-400'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => toggleDocumentSelection(doc.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(doc.size / 1024)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="text-red-500 hover:text-red-600 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* Show processing documents */}
              {documents.filter(d => d && (d.status === 'uploading' || d.status === 'processing')).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-yellow-600">
                        {doc.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <button
              onClick={clearMessages}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-400/20">
                      <p className="text-xs opacity-70">
                        Sources: {message.sources.length} chunks found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 p-4 rounded-lg">
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-white text-gray-900 placeholder-gray-400 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                disabled={chatLoading || selectedDocuments.length === 0}
              />
              <button
                type="submit"
                disabled={chatLoading || !query.trim() || selectedDocuments.length === 0}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            {selectedDocuments.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Select at least one document to start chatting
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
