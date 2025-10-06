import { NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { getDocumentsByUserId } from '@/lib/db';

export async function GET() {
  try {
    console.log('[GET /api/documents] Getting session...');
    const session = await auth0.getSession();
    console.log('[GET /api/documents] Session:', session ? 'found' : 'not found');

    if (!session?.user) {
      console.log('[GET /api/documents] No user in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GET /api/documents] User email:', session.user.email);

    // Sync user with database and get user ID
    const userId = await syncUserWithDatabase(session.user);
    console.log('[GET /api/documents] User ID:', userId);

    if (!userId) {
      console.log('[GET /api/documents] Failed to sync user');
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    const documents = await getDocumentsByUserId(userId);
    console.log('[GET /api/documents] Found documents:', documents.length);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('[GET /api/documents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
