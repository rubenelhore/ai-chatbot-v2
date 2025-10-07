import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Lazy initialization to avoid errors during build time
let pinecone: Pinecone | null = null;
let openai: OpenAI | null = null;

function getPinecone() {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'document-chatbot';

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 * This model provides 1536 dimensions and is cost-effective
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 768, // Match Pinecone index dimension
  });

  return response.data[0].embedding;
}

/**
 * Upsert document chunks as vectors into Pinecone
 */
export async function upsertVectors(
  userId: string,
  documentId: string,
  chunks: string[],
  fileName: string
): Promise<number> {
  const client = getPinecone();
  const index = client.Index(PINECONE_INDEX_NAME);
  const namespace = `user-${userId}`;

  const vectors = [];
  const batchSize = 10;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

    // Generate embeddings for the batch
    const embeddings = await Promise.all(
      batch.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk);
        return {
          id: `${documentId}_chunk_${i + idx}`,
          values: embedding,
          metadata: {
            documentId,
            chunkIndex: i + idx,
            text: chunk.substring(0, 1000), // Store first 1000 chars for context
            chunkCount: chunks.length,
            fileName,
          },
        };
      })
    );

    vectors.push(...embeddings);
  }

  await index.namespace(namespace).upsert(vectors);
  return vectors.length;
}

/**
 * Delete all vectors for a document from Pinecone
 */
export async function deleteVectors(
  userId: string,
  documentId: string,
  chunkCount: number
): Promise<void> {
  const client = getPinecone();
  const index = client.Index(PINECONE_INDEX_NAME);
  const namespace = `user-${userId}`;

  const vectorIds = [];
  for (let i = 0; i < chunkCount; i++) {
    vectorIds.push(`${documentId}_chunk_${i}`);
  }

  if (vectorIds.length > 0) {
    await index.namespace(namespace).deleteMany(vectorIds);
  }
}

/**
 * Query vectors using semantic search
 */
export async function queryVectors(
  userId: string,
  query: string,
  documentIds: string[],
  topK: number = 5
) {
  const client = getPinecone();
  const index = client.Index(PINECONE_INDEX_NAME);
  const namespace = `user-${userId}`;

  const embedding = await generateEmbedding(query);

  const results = await index.namespace(namespace).query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: {
      documentId: { $in: documentIds },
    },
  });

  return results;
}

/**
 * Generate chat response using OpenAI GPT-4 Turbo
 */
export async function generateChatResponse(
  context: string,
  query: string
): Promise<string> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an expert assistant that answers questions based solely on the provided context from documents.

Instructions:
1. Answer ONLY based on the provided context
2. If you don't find relevant information, clearly state that
3. Include specific citations when appropriate
4. Be concise but informative
5. Respond in English
6. If information is incomplete, mention what's missing`,
      },
      {
        role: 'user',
        content: `Context from documents:
${context}

Question: ${query}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0].message.content || 'No response generated';
}

/**
 * Generate a streaming chat response (for future implementation)
 */
export async function generateChatResponseStream(
  context: string,
  query: string
) {
  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an expert assistant that answers questions based solely on the provided context from documents.

Instructions:
1. Answer ONLY based on the provided context
2. If you don't find relevant information, clearly state that
3. Include specific citations when appropriate
4. Be concise but informative
5. Respond in English
6. If information is incomplete, mention what's missing`,
      },
      {
        role: 'user',
        content: `Context from documents:
${context}

Question: ${query}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  return stream;
}
