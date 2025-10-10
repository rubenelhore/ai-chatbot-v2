import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  // Auth0 middleware handles all /api/auth/* routes
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match /api/auth/* routes for Auth0 authentication handling
     */
    '/api/auth/:path*',
  ],
};
