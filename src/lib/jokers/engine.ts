import type { PoolClient } from 'pg';
import { withTransaction } from '@/lib/db/pool';
import {
  getJoker,
  jokerPrice,
  nextJokerPrice,
  JOKER_CONSTANTS,
  type JokerScope,
} from './catalog';
import { getBonusBalanceTx, postBonus } from './ledger';

// ───────────────────────── Helpers d'effet purs (testables, sans DB) ─────────────────────────

/** Multiplicateur d'ELO du joker : Caféine ×2, Dopage ×3, 1 sinon. */
export function jokerEloMultiplier(jokerId: string | null): number {
  if (jokerId === 'cafeine') return 2;
  if (jokerId === 'dopage') return 3;
  return 1;
}

/**
 * Applique l'effet d'un joker à la variation d'ELO.
 * `rawDelta` = valeur NON arrondie `K·(résultat − attendu)` → l'arrondi est fait ICI, APRÈS la
 * multiplication (cf. spec §5.1 : `round(mult·K·…)`, pas `mult·round(…)`).
 * - Caféine/Dopage : `round(mult·rawDelta)` (gain ET perte).
 * - Gilet pare-balles : perte ramenée à 0 (gain inchangé).
 * - null / autre : `round(rawDelta)`.
 */
export function applyJokerToVariation(rawDelta: number, jokerId: string | null): number {
  if (jokerId === 'gilet-pare-balles') {
    const rounded = Math.round(rawDelta);
    return rounded < 0 ? 0 : rounded;
  }
  return Math.round(jokerEloMultiplier(jokerId) * rawDelta);
}

/**
 * Applique l'effet d'un joker au bonus. Seul « Seconde chance » au 2e essai le divise par deux
 * (`round(0.5·bonus)`). Caféine/Dopage ne touchent PAS au bonus.
 */
export function applyJokerToBonus(bonus: number, jokerId: string | null, secondTry: boolean): number {
  if (jokerId === 'seconde-chance' && secondTry) return Math.round(0.5 * bonus);
  return bonus;
}

/**
 * Variation d'ELO au 2e essai de « Seconde chance » : gain ×½ si juste, perte PLEINE si faux.
 * `rawDelta` = `K·(résultat − attendu)` non arrondi (positif si juste, négatif si faux).
 */
export function secondChanceVariation(rawDelta: number, correct: boolean): number {
  return correct ? Math.round(0.5 * rawDelta) : Math.round(rawDelta);
}

/** Score effectif d'un joueur en bataille : +1 si Fourbe est actif ET la question doublée est correcte. */
export function effectiveBattleScore(
  rawScore: number,
  fourbe: { active: boolean; slotCorrect: boolean },
): number {
  return rawScore + (fourbe.active && fourbe.slotCorrect ? 1 : 0);
}

/** Un joker consommable est-il utilisable dans ce contexte (solo/bataille) ? Garde-fou serveur. */
export function isJokerUsableInScope(jokerId: string | null, scope: JokerScope): boolean {
  if (!jokerId) return false;
  const def = getJoker(jokerId);
  return !!def && def.kind === 'consumable' && def.scope === scope;
}

// ───────────────────────────────── Couche d'accès base ─────────────────────────────────

/**
 * Achat d'un joker consommable. Le prix croît de 30 % à chaque achat de ce joker par ce joueur
 * (`nextJokerPrice(base, purchased)`). Transaction atomique : verrou ligne, débit, +1 qty, +1 purchased.
 */
export async function purchaseJoker(userId: number, jokerId: string): Promise<void> {
  const def = getJoker(jokerId);
  if (!def || def.kind !== 'consumable' || def.price == null) throw new Error('joker invalide');
  const base = jokerPrice(def)!;
  await withTransaction(async (client) => {
    const owned = await client.query<{ purchased: number }>(
      'SELECT purchased FROM user_jokers WHERE user_id = $1 AND joker_id = $2 FOR UPDATE',
      [userId, jokerId],
    );
    const purchased = owned.rows[0]?.purchased ?? 0;
    const price = nextJokerPrice(base, purchased);
    const balance = await getBonusBalanceTx(client, userId);
    if (balance < price) throw new Error('solde insuffisant');
    await postBonus(client, userId, -price, 'joker_purchase', { type: 'joker', id: 0 });
    await client.query(
      `INSERT INTO user_jokers (user_id, joker_id, qty, purchased) VALUES ($1, $2, 1, 1)
       ON CONFLICT (user_id, joker_id)
       DO UPDATE SET qty = user_jokers.qty + 1, purchased = user_jokers.purchased + 1`,
      [userId, jokerId],
    );
  });
}

/** Décrémente l'inventaire d'un joker (échoue silencieusement si qty=0). Renvoie true si consommé. */
export async function consumeJoker(
  client: PoolClient,
  userId: number,
  jokerId: string,
): Promise<boolean> {
  const r = await client.query(
    'UPDATE user_jokers SET qty = qty - 1 WHERE user_id = $1 AND joker_id = $2 AND qty > 0 RETURNING qty',
    [userId, jokerId],
  );
  return r.rowCount === 1;
}

/** Conversion « Balle dans le pied » : −ELO contre +bonus. Refusée sous le plancher d'ELO. */
export async function balleDansLePied(userId: number): Promise<void> {
  const { BALLE_ELO_COST, BALLE_BONUS_GAIN, BALLE_ELO_FLOOR } = JOKER_CONSTANTS;
  await withTransaction(async (client) => {
    const r = await client.query<{ elo: number }>('SELECT elo FROM users WHERE id = $1 FOR UPDATE', [
      userId,
    ]);
    const elo = r.rows[0]?.elo;
    if (elo == null) throw new Error('Utilisateur introuvable');
    if (elo - BALLE_ELO_COST < BALLE_ELO_FLOOR) throw new Error('ELO insuffisant pour cette conversion');
    await client.query('UPDATE users SET elo = elo - $1 WHERE id = $2', [BALLE_ELO_COST, userId]);
    await postBonus(client, userId, BALLE_BONUS_GAIN, 'balle_dans_le_pied');
  });
}

/** Conversion « Recyclage » : sacrifie 1 exemplaire d'un joker possédé contre ⌊prix/3⌋ bonus. */
export async function recyclage(userId: number, jokerId: string): Promise<void> {
  const def = getJoker(jokerId);
  if (!def || def.kind !== 'consumable' || def.price == null) throw new Error('joker non recyclable');
  const gain = Math.floor(jokerPrice(def)! * JOKER_CONSTANTS.RECYCLAGE_RATE);
  await withTransaction(async (client) => {
    const ok = await consumeJoker(client, userId, jokerId);
    if (!ok) throw new Error('joker non possédé');
    await postBonus(client, userId, gain, 'recyclage', { type: 'joker', id: 0 });
  });
}
