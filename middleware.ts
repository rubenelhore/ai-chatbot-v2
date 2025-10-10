import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  // Match /api/auth/* routes for Auth0 to handle login, logout, callback
  matcher: ['/api/auth/login', '/api/auth/logout', '/api/auth/callback', '/api/auth/me'],
};
