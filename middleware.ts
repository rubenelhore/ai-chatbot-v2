import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match /api/auth/* routes for Auth0 authentication handling
     */
    '/api/auth/:path*',
    /*
     * Match page routes only (not API routes, static files, etc.)
     * This protects pages while leaving other API routes unaffected
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
