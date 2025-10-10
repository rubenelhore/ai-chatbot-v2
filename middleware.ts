import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // NEVER run middleware on /api routes
  if (path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Only run Auth0 middleware on /auth/* routes
  if (path.startsWith('/auth')) {
    return await auth0.middleware(request);
  }

  // For all other routes, pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
