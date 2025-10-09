import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0';

export interface Document {
  id: string;
  user_id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file_path: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string | null;
  chunk_count: number;
  text_length: number;
  uploaded_at: string;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const useDocuments = () => {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  // Cache bust: 2025-10-09T17:40:00Z
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();

    // Poll for updates every 5 seconds when there are processing documents
    const hasProcessing = documents.some(
      (doc) => doc.status === 'uploading' || doc.status === 'processing'
    );

    const interval = setInterval(() => {
      if (hasProcessing) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, documents, fetchDocuments]);

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[uploadDocument] Uploading file:', file.name);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('[uploadDocument] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[uploadDocument] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error('Upload failed: ' + response.statusText);
        }
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      console.log('[uploadDocument] Upload successful:', data);

      // Add to local state immediately
      setDocuments((prev) => [data.document, ...prev]);

      // Refresh documents
      setTimeout(() => fetchDocuments(), 1000);

      return data.document;
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err : new Error('Upload failed'));
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      // Remove from local state immediately
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err instanceof Error ? err : new Error('Delete failed'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocumentsByStatus = (status: Document['status']) => {
    return documents.filter((doc) => doc.status === status);
  };

  const getReadyDocuments = () => {
    return documents.filter((doc) => doc.status === 'ready');
  };

  const getProcessingDocuments = () => {
    return documents.filter((doc) =>
      doc && ['uploading', 'processing'].includes(doc.status)
    );
  };

  const getErrorDocuments = () => {
    return documents.filter((doc) => doc.status === 'error');
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    deleteDocument,
    isDeleting,
    error,
    refetch: fetchDocuments,

    // Helper functions
    getDocumentsByStatus,
    getReadyDocuments,
    getProcessingDocuments,
    getErrorDocuments,

    // Stats
    totalDocuments: documents.length,
    readyDocuments: getReadyDocuments().length,
    processingDocuments: getProcessingDocuments().length,
    errorDocuments: getErrorDocuments().length,
  };
};
