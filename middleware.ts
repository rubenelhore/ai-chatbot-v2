import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  // Only run Auth0 middleware on /auth/* routes
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return await auth0.middleware(request);
  }
  // For all other routes, let them pass through
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
