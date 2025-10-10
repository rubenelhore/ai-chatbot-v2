import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  // Only run on /auth/* routes
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return await auth0.middleware(request);
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
