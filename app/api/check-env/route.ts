import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobTokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) || 'NOT SET',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasPinecone: !!process.env.PINECONE_API_KEY,
    pineconeIndex: process.env.PINECONE_INDEX_NAME || 'NOT SET',
  });
}
