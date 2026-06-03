export type LtdsLevel = 'facile' | 'difficile';

export interface LtdsClientConfig {
  baseUrl: string;
  token: string;
}

export interface LtdsFetchResult {
  ok: boolean;
  status: number;
  payload?: unknown;
}

const REQUEST_TIMEOUT_MS = 15_000;

/** GET /game/{level}/{day} avec Bearer token. */
export async function fetchGameDay(
  config: LtdsClientConfig,
  level: LtdsLevel,
  day: number,
): Promise<LtdsFetchResult> {
  const url = new URL(`/game/${level}/${day}`, config.baseUrl).toString();
  const token = config.token.replace(/^Bearer\s+/i, '');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, status: res.status, payload: (await res.json()) as unknown };
}
