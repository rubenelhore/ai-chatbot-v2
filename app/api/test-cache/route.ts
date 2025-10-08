import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Cache test endpoint working!',
    timestamp: new Date().toISOString(),
    deployment: 'qpl4y55x2-new'
  });
}
