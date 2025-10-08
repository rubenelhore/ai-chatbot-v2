// Database client that works with both local PostgreSQL and Neon Serverless
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  return pool;
}

// Check if we're using Neon (in production)
function isNeonEnvironment() {
  // Check for Vercel environment variable
  if (process.env.VERCEL === '1') return true;

  // Check if POSTGRES_URL points to Neon
  const url = process.env.POSTGRES_URL || '';
  return url.includes('neon.tech');
}

// Template literal tag function for SQL queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql<T = any>(
  strings: TemplateStringsArray,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...values: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const useNeon = isNeonEnvironment();

  if (useNeon) {
    // Use Neon serverless driver in production
    // Try both DATABASE_URL and POSTGRES_URL (Neon convention vs Vercel convention)
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!connectionString) {
      console.error('[postgres] Environment variables:', {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'NOT SET',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'NOT SET',
        POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'set' : 'NOT SET',
      });
      throw new Error('No database connection string found. Set DATABASE_URL or POSTGRES_URL.');
    }

    console.log('[postgres] Connecting to Neon with URL:', connectionString.substring(0, 50) + '...');

    const sql = neon(connectionString, {
      fullResults: true,
    });

    // Call Neon as a tagged template function
    const result = await sql(strings, ...values);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  } else {
    // Use pg Pool for local development
    const client = getPool();
    if (!client) {
      throw new Error('Database pool not initialized');
    }

    // Build the query from template literal
    let query = strings[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += `$${i + 1}${strings[i + 1]}`;
    }

    const result = await client.query(query, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  }
}
