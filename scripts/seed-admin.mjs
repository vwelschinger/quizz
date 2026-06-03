// Crée (ou réinitialise) le compte admin à partir des variables d'environnement.
// Idempotent : rejouable sans créer de doublon.
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('DATABASE_URL, ADMIN_USERNAME et ADMIN_PASSWORD sont requis.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

await client.connect();
await client.query(
  `INSERT INTO users (username, password_hash, role)
   VALUES ($1, $2, 'admin')
   ON CONFLICT (username)
   DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
  [ADMIN_USERNAME, hash],
);
console.log(`Admin "${ADMIN_USERNAME}" prêt.`);
await client.end();
