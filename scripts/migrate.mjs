// Applique les migrations SQL de db/migrations/ dans l'ordre alphabétique,
// une seule fois chacune (suivi dans la table _migrations).
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'db', 'migrations');

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL manquant.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`);

  const { rows } = await client.query('SELECT filename FROM _migrations');
  const applied = new Set(rows.map((r) => r.filename));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    console.log(`-> Application de ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      await client.query('COMMIT');
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Échec sur ${file} :`, err.message);
      process.exit(1);
    }
  }

  console.log(count ? `${count} migration(s) appliquée(s).` : 'Aucune migration en attente.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
