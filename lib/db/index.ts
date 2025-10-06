import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  email_verified?: Date | null;
  created_at: Date;
  updated_at: Date;
}

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
  uploaded_at: Date;
  processed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Chat {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  query: string;
  response: string;
  document_ids: string[];
  sources?: any;
  created_at: Date;
  updated_at: Date;
}

// Document operations
export async function createDocument(data: {
  user_id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file_path: string;
  status?: 'uploading' | 'processing' | 'ready' | 'error';
}): Promise<Document> {
  const result = await sql<Document>`
    INSERT INTO documents (user_id, name, size, type, url, file_path, status)
    VALUES (${data.user_id}, ${data.name}, ${data.size}, ${data.type}, ${data.url}, ${data.file_path}, ${data.status || 'uploading'})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getDocumentsByUserId(userId: string): Promise<Document[]> {
  const result = await sql<Document>`
    SELECT * FROM documents
    WHERE user_id = ${userId}
    ORDER BY uploaded_at DESC
  `;
  return result.rows;
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const result = await sql<Document>`
    SELECT * FROM documents
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function updateDocumentStatus(
  id: string,
  status: 'uploading' | 'processing' | 'ready' | 'error',
  updates?: {
    error?: string;
    chunk_count?: number;
    text_length?: number;
  }
): Promise<Document> {
  const result = await sql<Document>`
    UPDATE documents
    SET
      status = ${status},
      error = ${updates?.error || null},
      chunk_count = COALESCE(${updates?.chunk_count || null}, chunk_count),
      text_length = COALESCE(${updates?.text_length || null}, text_length),
      processed_at = ${status === 'ready' || status === 'error' ? 'CURRENT_TIMESTAMP' : null}
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0];
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM documents
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return (result.rowCount || 0) > 0;
}

// Chat operations
export async function createChat(data: {
  user_id: string;
  conversation_id?: string;
  query: string;
  response: string;
  document_ids: string[];
  sources?: any;
}): Promise<Chat> {
  const result = await sql<Chat>`
    INSERT INTO chats (user_id, conversation_id, query, response, document_ids, sources)
    VALUES (
      ${data.user_id},
      ${data.conversation_id || null},
      ${data.query},
      ${data.response},
      ${data.document_ids},
      ${data.sources ? JSON.stringify(data.sources) : null}
    )
    RETURNING *
  `;
  return result.rows[0];
}

export async function getChatsByUserId(userId: string, limit: number = 50): Promise<Chat[]> {
  const result = await sql<Chat>`
    SELECT * FROM chats
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}

export async function getChatsByConversationId(conversationId: string): Promise<Chat[]> {
  const result = await sql<Chat>`
    SELECT * FROM chats
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;
  return result.rows;
}

// User operations (for NextAuth adapter if needed)
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql<User>`
    SELECT * FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function createUser(data: {
  email: string;
  name?: string;
  image?: string;
}): Promise<User> {
  const result = await sql<User>`
    INSERT INTO users (email, name, image)
    VALUES (${data.email}, ${data.name || null}, ${data.image || null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql<User>`
    SELECT * FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows[0] || null;
}
