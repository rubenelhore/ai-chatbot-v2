import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus } from '@/lib/db';
import { extractTextFromFile, preprocessText, chunkText } from '@/lib/document-processor';
import { upsertVectors } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    console.log('[PROCESS] Starting document processing...');

    const body = await request.json();
    const { documentId, fileUrl, fileName, userId } = body;

    if (!documentId || !fileUrl || !fileName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[PROCESS] Processing document ${documentId}`);

    // Update status to processing
    await updateDocumentStatus(documentId, 'processing');

    // Download file
    console.log(`[PROCESS] Downloading file from ${fileUrl}`);
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[PROCESS] File downloaded, size: ${buffer.length} bytes`);

    // Extract text
    console.log(`[PROCESS] Extracting text from ${fileName}`);
    let text = await extractTextFromFile(buffer, fileName);
    text = preprocessText(text);
    console.log(`[PROCESS] Text extracted, length: ${text.length} characters`);

    if (!text || text.length === 0) {
      throw new Error('No text content found in document');
    }

    // Chunk text
    console.log(`[PROCESS] Chunking text...`);
    const chunks = chunkText(text, 1000, 200);
    console.log(`[PROCESS] Created ${chunks.length} chunks`);

    // Generate embeddings and upsert to Pinecone
    console.log(`[PROCESS] Generating embeddings and upserting to Pinecone...`);
    const vectorCount = await upsertVectors(userId, documentId, chunks, fileName);
    console.log(`[PROCESS] Upserted ${vectorCount} vectors to Pinecone`);

    // Update document status to ready
    console.log(`[PROCESS] Updating document status to ready...`);
    await updateDocumentStatus(documentId, 'ready', {
      chunk_count: chunks.length,
      text_length: text.length,
    });

    console.log(`[PROCESS] ✅ Document ${documentId} processed successfully`);

    return NextResponse.json({
      success: true,
      documentId,
      vectorCount,
      chunkCount: chunks.length,
      textLength: text.length,
    });
  } catch (error) {
    console.error('[PROCESS] Error:', error);
    console.error('[PROCESS] Error details:', error instanceof Error ? error.message : 'Unknown');
    console.error('[PROCESS] Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
