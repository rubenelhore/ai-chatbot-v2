import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-UPLOAD] Request received');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('[TEST-UPLOAD] No file provided');
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    console.log('[TEST-UPLOAD] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      }
    });
  } catch (error) {
    console.error('[TEST-UPLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
