import { NextRequest, NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { queryVectors, generateChatResponse } from '@/lib/ai';
import { createChat } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { query, documentIds, conversationId } = body;

    if (!query || !documentIds || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Query and document IDs are required' },
        { status: 400 }
      );
    }

    // Validate conversationId is a valid UUID or null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validConversationId = conversationId && uuidRegex.test(conversationId) ? conversationId : null;

    console.log(`Processing chat query for user ${userId}:`, query);

    // Query Pinecone for relevant document chunks
    const searchResults = await queryVectors(
      userId,
      query,
      documentIds,
      5
    );

    // Handle no results
    if (!searchResults.matches || searchResults.matches.length === 0) {
      const noResultsResponse = {
        response: 'I could not find relevant information in the provided documents to answer your question.',
        sources: [],
        chatId: '',
      };
      return NextResponse.json(noResultsResponse);
    }

    // Build context from search results
    const context = searchResults.matches
      .map((match) => {
        const text = match.metadata?.text;
        return typeof text === 'string' ? text : '';
      })
      .filter((text) => text.length > 0)
      .join('\n\n---\n\n');

    // Generate response using OpenAI GPT-4
    const response = await generateChatResponse(context, query);

    // Prepare sources
    const sources = searchResults.matches.map((match) => ({
      documentId: String(match.metadata?.documentId || ''),
      chunkIndex: Number(match.metadata?.chunkIndex || 0),
      score: match.score || 0,
      text: String(match.metadata?.text || '').substring(0, 200), // First 200 chars
    }));

    // Save chat to database
    const chat = await createChat({
      user_id: userId,
      conversation_id: validConversationId,
      query,
      response,
      document_ids: documentIds,
      sources,
    });

    return NextResponse.json({
      response,
      sources,
      chatId: chat.id,
    });
  } catch (error) {
    console.error('Error in chat query:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to process chat query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
