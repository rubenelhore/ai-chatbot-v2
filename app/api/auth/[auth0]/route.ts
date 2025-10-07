import { auth0 } from '@/lib/auth';

// Handle all Auth0 routes: /api/auth/login, /api/auth/callback, /api/auth/logout, etc.
export const GET = auth0.handleRequest();
