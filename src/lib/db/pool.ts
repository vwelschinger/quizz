import { Pool, type PoolClient, type QueryResultRow } from 'pg';

// Pool unique réutilisé entre les rechargements à chaud (HMR) en dev.
const globalForPg = globalThis as unknown as { __quizzPgPool?: Pool };

function getPool(): Pool {
  if (!globalForPg.__quizzPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL manquant : impossible de se connecter à PostgreSQL.');
    }
    globalForPg.__quizzPgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForPg.__quizzPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Exécute fn dans une transaction (COMMIT au succès, ROLLBACK sinon). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { getPool };
