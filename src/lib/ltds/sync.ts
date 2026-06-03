import { getSetting, setSetting } from '@/lib/db/settings';
import { upsertQuestion } from '@/lib/db/questions';
import { fetchGameDay, type LtdsClientConfig } from './client';
import { mapGameDay, isDayComplete } from './mapper';
import { inspectToken, type TokenStatus } from './tokenStatus';

const TOKEN_KEY = 'ltds_token';
const BASEURL_KEY = 'ltds_base_url';
const SYNC_STATE_KEY = 'ltds_sync_state';
const LAST_DAY_KEY = 'ltds_last_day';

const DEFAULT_BASE_URL = 'https://api.latabledessavoirs.fr';
const START_DAY = Number(process.env.LTDS_START_DAY ?? '1');
const MAX_DAYS_PER_SYNC = Number(process.env.LTDS_MAX_DAYS_PER_SYNC ?? '40');
const REQUEST_DELAY_MS = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncState {
  ok: boolean;
  imported: number; // questions upsertées
  daysImported: number; // jours traités
  lastDay: number; // curseur (dernier jour importé)
  more: boolean; // reste-t-il des jours à importer ?
  error?: string;
  startedAt: string;
  finishedAt: string;
}

// Token / URL : stockés en base (rotables via l'admin), repli sur l'env, défaut intégré pour l'URL.
export async function getLtdsToken(): Promise<string | null> {
  return (await getSetting<string>(TOKEN_KEY)) ?? process.env.LTDS_API_TOKEN ?? null;
}
export async function getLtdsBaseUrl(): Promise<string> {
  return (
    (await getSetting<string>(BASEURL_KEY)) ?? process.env.LTDS_API_BASE_URL ?? DEFAULT_BASE_URL
  );
}
export async function setLtdsToken(token: string): Promise<void> {
  await setSetting(TOKEN_KEY, token);
}
export async function setLtdsBaseUrl(url: string): Promise<void> {
  await setSetting(BASEURL_KEY, url);
}
export async function getLtdsTokenStatus(): Promise<TokenStatus> {
  return inspectToken(await getLtdsToken());
}
export async function getSyncState(): Promise<SyncState | null> {
  return getSetting<SyncState>(SYNC_STATE_KEY);
}

async function getConfig(): Promise<LtdsClientConfig | null> {
  const token = await getLtdsToken();
  if (!token) return null;
  return { token, baseUrl: await getLtdsBaseUrl() };
}

/**
 * Synchro par backfill incrémental : à partir du curseur (dernier jour importé),
 * avance jour par jour (facile + difficile) tant que les jours sont "complets"
 * (stats communautaires présentes), dans la limite de MAX_DAYS_PER_SYNC.
 */
export async function runSync(): Promise<SyncState> {
  const startedAt = new Date().toISOString();
  const finish = (s: Omit<SyncState, 'finishedAt'>): SyncState => ({
    ...s,
    finishedAt: new Date().toISOString(),
  });

  const config = await getConfig();
  if (!config) {
    const state = finish({
      ok: false,
      imported: 0,
      daysImported: 0,
      lastDay: 0,
      more: false,
      error: 'Token "La Table des Savoirs" manquant.',
      startedAt,
    });
    await setSetting(SYNC_STATE_KEY, state);
    return state;
  }

  let lastDay = (await getSetting<number>(LAST_DAY_KEY)) ?? START_DAY - 1;
  let imported = 0;
  let daysImported = 0;
  let more = false;

  try {
    for (let i = 0; i < MAX_DAYS_PER_SYNC; i++) {
      const day = lastDay + 1;

      const facile = await fetchGameDay(config, 'facile', day);
      if (!facile.ok) {
        if (facile.status === 401 || facile.status === 403) {
          throw new Error(`Token refusé (HTTP ${facile.status}). Mets à jour le token.`);
        }
        more = false; // jour futur / inexistant → terminé
        break;
      }
      if (!isDayComplete(facile.payload)) {
        more = true; // jour en cours (pas encore de stats) → réessayer plus tard
        break;
      }

      for (const q of mapGameDay(facile.payload)) {
        await upsertQuestion(q);
        imported++;
      }
      await sleep(REQUEST_DELAY_MS);

      const difficile = await fetchGameDay(config, 'difficile', day);
      if (difficile.ok && isDayComplete(difficile.payload)) {
        for (const q of mapGameDay(difficile.payload)) {
          await upsertQuestion(q);
          imported++;
        }
      }
      await sleep(REQUEST_DELAY_MS);

      lastDay = day;
      daysImported++;
      await setSetting(LAST_DAY_KEY, lastDay);
    }
    if (daysImported === MAX_DAYS_PER_SYNC) more = true; // plafond atteint, il reste des jours

    const state = finish({ ok: true, imported, daysImported, lastDay, more, startedAt });
    await setSetting(SYNC_STATE_KEY, state);
    return state;
  } catch (err) {
    const state = finish({
      ok: false,
      imported,
      daysImported,
      lastDay,
      more: true,
      error: err instanceof Error ? err.message : String(err),
      startedAt,
    });
    await setSetting(SYNC_STATE_KEY, state);
    return state;
  }
}
