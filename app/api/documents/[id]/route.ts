import { NextRequest, NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { getDocumentById, deleteDocument } from '@/lib/db';
import { del } from '@vercel/blob';
import { deleteVectors } from '@/lib/ai';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user with database and get user ID
    const userId = await syncUserWithDatabase(session.user);

    if (!userId) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    const { id: documentId } = await params;

    // Get document to verify ownership and get file path
    const document = await getDocumentById(documentId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Vercel Blob
    try {
      await del(document.url);
    } catch (error) {
      console.warn('Error deleting from blob storage:', error);
    }

    // Delete vectors from Pinecone
    try {
      await deleteVectors(userId, documentId, document.chunk_count);
    } catch (error) {
      console.warn('Error deleting vectors:', error);
    }

    // Delete from database
    const deleted = await deleteDocument(documentId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
