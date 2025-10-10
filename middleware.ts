import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  // Only call Auth0 middleware on /api/auth/* routes
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return await auth0.middleware(request);
  }

  // For all other routes, just continue
  return;
}

export const config = {
  matcher: [
    /*
     * Match /api/auth/* routes for Auth0 authentication handling
     */
    '/api/auth/:path*',
  ],
};
