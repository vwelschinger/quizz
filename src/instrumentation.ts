// Code exécuté une fois au démarrage du serveur Next (hook officiel `register`).
// On y branche le scheduler de synchro quotidienne (node-cron).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Rétro-crédit unique des Kopecks (badges + batailles déjà acquis). Idempotent, fire-and-forget.
  void import('@/lib/jokers/backfill')
    .then(({ backfillKopecksOnce }) => backfillKopecksOnce())
    .then(() => console.log('[kopecks] backfill rétroactif vérifié.'))
    .catch((e) => console.error('[kopecks] backfill échec:', e));

  if (process.env.SYNC_SCHEDULER_ENABLED === 'false') return;

  const globalForCron = globalThis as unknown as { __quizzCronScheduled?: boolean };
  if (globalForCron.__quizzCronScheduled) return;

  const expr = process.env.SYNC_CRON || '0 6 * * *';
  const tz = process.env.TZ || 'Europe/Paris';

  const cron = (await import('node-cron')).default;
  if (!cron.validate(expr)) {
    console.error(`[cron] expression invalide: "${expr}" — scheduler désactivé.`);
    return;
  }

  const { runSync } = await import('@/lib/ltds/sync');
  cron.schedule(
    expr,
    () => {
      runSync()
        .then((s) => console.log('[cron] synchro La Table des Savoirs:', s))
        .catch((e) => console.error('[cron] échec synchro:', e));
    },
    { timezone: tz },
  );

  globalForCron.__quizzCronScheduled = true;
  console.log(`[cron] synchro quotidienne planifiée "${expr}" (${tz}).`);
}
