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
    const sql = neon(process.env.POSTGRES_URL!, {
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
