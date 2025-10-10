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
     * Match all other request paths except:
     * - /api/* (other API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api/(?!auth)|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
