import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    postgresUrlPrefix: process.env.POSTGRES_URL?.substring(0, 50) || 'NOT SET',
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
  });
}
