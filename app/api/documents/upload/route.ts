import { NextRequest, NextResponse } from 'next/server';
import { auth0, syncUserWithDatabase } from '@/lib/auth';
import { put } from '@vercel/blob';
import { createDocument, updateDocumentStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[UPLOAD] Starting upload process...');

    const session = await auth0.getSession();

    if (!session?.user) {
      console.log('[UPLOAD] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[UPLOAD] User authenticated:', session.user.email);

    // Sync user with database and get user ID
    const userId = await syncUserWithDatabase(session.user);

    if (!userId) {
      console.log('[UPLOAD] Failed to sync user');
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    console.log('[UPLOAD] User synced, userId:', userId);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('[UPLOAD] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[UPLOAD] File received:', file.name, file.size, file.type);

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      console.log('[UPLOAD] Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log('[UPLOAD] File too large:', file.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    console.log('[UPLOAD] Uploading to Vercel Blob...');
    console.log('[UPLOAD] BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);

    const blob = await put(`uploads/${userId}/${Date.now()}_${file.name}`, file, {
      access: 'public',
    });

    console.log('[UPLOAD] Blob upload successful:', blob.url);

    // Create document record in database
    console.log('[UPLOAD] Creating document record in database...');
    const document = await createDocument({
      user_id: userId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: blob.url,
      file_path: blob.pathname,
      status: 'ready', // Set to ready immediately for testing
    });

    console.log('[UPLOAD] Document created:', document.id);

    console.log('[UPLOAD] Returning document to client');
    return NextResponse.json({ document });
  } catch (error) {
    console.error('[UPLOAD] Error uploading document:', error);
    console.error('[UPLOAD] Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
