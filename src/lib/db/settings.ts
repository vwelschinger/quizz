import { query, queryOne } from './pool';

/** Lit une valeur de réglage (JSONB). */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await queryOne<{ value: T }>('SELECT value FROM settings WHERE key = $1', [key]);
  return row ? row.value : null;
}

/** Écrit/met à jour une valeur de réglage (JSONB). */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}
