// Database client that works with both local PostgreSQL and Vercel Postgres
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  return pool;
}

// Check if we're in Vercel environment (runtime check)
function isVercelEnvironment() {
  // Check for Vercel environment variable
  if (process.env.VERCEL === '1') return true;

  // Check if POSTGRES_URL points to Neon/Vercel
  const url = process.env.POSTGRES_URL || '';
  return url.includes('neon.tech') || url.includes('vercel-storage');
}

// Template literal tag function that mimics @vercel/postgres sql API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql<T = any>(
  strings: TemplateStringsArray,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...values: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const useVercelPostgres = isVercelEnvironment();

  console.log('[postgres] Using Vercel Postgres:', useVercelPostgres);
  console.log('[postgres] POSTGRES_URL:', process.env.POSTGRES_URL?.substring(0, 50) + '...');

  if (useVercelPostgres) {
    // Use Vercel Postgres in production
    console.log('[postgres] Using @vercel/postgres');
    const { sql: vercelSql } = await import('@vercel/postgres');
    const result = await vercelSql(strings, ...values);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  } else {
    console.log('[postgres] Using pg Pool');
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
