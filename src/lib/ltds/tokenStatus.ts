export interface TokenStatus {
  present: boolean;
  active: boolean;
  expiresAt: string | null; // ISO
  username: string | null;
}

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Inspecte un JWT (SANS vérifier la signature) pour en lire l'expiration.
 * Tolère le préfixe "Bearer ". Gère "exp" (secondes) et "expiresAt" (ms).
 */
export function inspectToken(token: string | null | undefined): TokenStatus {
  if (!token) return { present: false, active: false, expiresAt: null, username: null };
  const raw = token.replace(/^Bearer\s+/i, '').trim();
  const parts = raw.split('.');
  if (parts.length < 2) return { present: true, active: false, expiresAt: null, username: null };
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      exp?: number;
      expiresAt?: number;
      username?: string;
    };
    const expSeconds =
      typeof payload.exp === 'number'
        ? payload.exp
        : typeof payload.expiresAt === 'number'
          ? Math.floor(payload.expiresAt / 1000)
          : null;
    const expMs = expSeconds != null ? expSeconds * 1000 : null;
    return {
      present: true,
      active: expMs != null ? expMs > Date.now() : false,
      expiresAt: expMs != null ? new Date(expMs).toISOString() : null,
      username: payload.username ?? null,
    };
  } catch {
    return { present: true, active: false, expiresAt: null, username: null };
  }
}
