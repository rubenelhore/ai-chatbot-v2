import { NextRequest, NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { put } from '@vercel/blob';
import { createDocument, updateDocumentStatus } from '@/lib/db';
import { extractTextFromFile, preprocessText, chunkText } from '@/lib/document-processor';
import { upsertVectors } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession(request);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user with database and get user ID
    const userId = await syncUserWithDatabase(session.user);

    if (!userId) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    const blob = await put(`uploads/${userId}/${Date.now()}_${file.name}`, file, {
      access: 'public',
    });

    // Create document record in database
    const document = await createDocument({
      user_id: userId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: blob.url,
      file_path: blob.pathname,
      status: 'uploading',
    });

    // Process document in background (update status to processing)
    await updateDocumentStatus(document.id, 'processing');

    // Start async processing
    processDocumentAsync(document.id, blob.url, file.name, userId).catch((error) => {
      console.error('Background processing error:', error);
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

async function processDocumentAsync(
  documentId: string,
  fileUrl: string,
  fileName: string,
  userId: string
) {
  try {
    // Download file
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    let text = await extractTextFromFile(buffer, fileName);
    text = preprocessText(text);

    if (!text || text.length === 0) {
      throw new Error('No text content found in document');
    }

    // Chunk text
    const chunks = chunkText(text, 1000, 200);

    // Generate embeddings and upsert to Pinecone
    const vectorCount = await upsertVectors(userId, documentId, chunks, fileName);

    // Update document status to ready
    await updateDocumentStatus(documentId, 'ready', {
      chunk_count: chunks.length,
      text_length: text.length,
    });

    console.log(`Document ${documentId} processed successfully. ${vectorCount} vectors created.`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    await updateDocumentStatus(documentId, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
