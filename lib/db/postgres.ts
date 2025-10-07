// Database client that works with both local PostgreSQL and Vercel Postgres
import { Pool } from 'pg';

// Check if we're using Vercel Postgres (has specific connection string format)
const isVercelPostgres = process.env.POSTGRES_URL?.includes('neon.tech') ||
                         process.env.POSTGRES_URL?.includes('vercel-storage');

let pool: Pool | null = null;

function getPool() {
  if (!pool && !isVercelPostgres) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  return pool;
}

// Template literal tag function that mimics @vercel/postgres sql API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql<T = any>(
  strings: TemplateStringsArray,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...values: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  if (isVercelPostgres) {
    // Use Vercel Postgres in production
    const { sql: vercelSql } = await import('@vercel/postgres');
    return vercelSql(strings, ...values);
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
      rows: result.rows,
      rowCount: result.rowCount,
    };
  }
}
