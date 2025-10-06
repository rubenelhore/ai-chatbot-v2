import { NextRequest, NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { getDocumentsByUserId } from '@/lib/db';

export async function GET(request: NextRequest) {
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

    const documents = await getDocumentsByUserId(userId);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
