import type { PoolClient } from 'pg';
import { query } from '@/lib/db/pool';

// Grand livre des points bonus. Le solde DÉPENSABLE d'un joueur = SUM(bonus_ledger.delta).
// À ne pas confondre avec le `totalBonus` historique (SUM(answers.bonus_points), jamais débité).

export type BonusReason =
  | 'solo_answer' // +bonus d'une bonne réponse solo
  | 'contestation' // +bonus recrédité par une contestation acceptée
  | 'migration_backfill' // crédit initial (rétro-crédit)
  | 'joker_purchase' // −prix d'un achat de joker
  | 'balle_dans_le_pied' // +bonus issu de la conversion ELO→bonus
  | 'recyclage'; // +bonus issu du recyclage d'un joker

export interface JokerInventoryRow {
  joker_id: string;
  qty: number;
  purchased: number; // nb d'achats déjà effectués (pour le prix progressif) ; ne diminue jamais
}

/** Solde dépensable d'un joueur. À utiliser partout où on affiche/débite des points bonus. */
export async function getBonusBalance(userId: number): Promise<number> {
  const rows = await query<{ balance: string }>(
    'SELECT COALESCE(SUM(delta), 0) AS balance FROM bonus_ledger WHERE user_id = $1',
    [userId],
  );
  return Number(rows[0]?.balance ?? 0);
}

/** Solde dépensable lu DANS une transaction en cours (cohérence achat/conversion). */
export async function getBonusBalanceTx(client: PoolClient, userId: number): Promise<number> {
  const res = await client.query<{ balance: string }>(
    'SELECT COALESCE(SUM(delta), 0) AS balance FROM bonus_ledger WHERE user_id = $1',
    [userId],
  );
  return Number(res.rows[0]?.balance ?? 0);
}

/** Crédit (delta>0) ou débit (delta<0) atomique. À appeler DANS la transaction de l'évènement. */
export async function postBonus(
  client: PoolClient,
  userId: number,
  delta: number,
  reason: BonusReason,
  ref?: { type: string; id: number },
): Promise<void> {
  await client.query(
    'INSERT INTO bonus_ledger (user_id, delta, reason, ref_type, ref_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, delta, reason, ref?.type ?? null, ref?.id ?? null],
  );
}

/** Inventaire des jokers possédés (qty > 0) d'un joueur. */
export async function getUserJokers(userId: number): Promise<JokerInventoryRow[]> {
  return query<JokerInventoryRow>(
    'SELECT joker_id, qty, purchased FROM user_jokers WHERE user_id = $1 AND qty > 0',
    [userId],
  );
}

/**
 * Compteurs d'achats par joker (même à qty=0), pour calculer le prix progressif côté UI.
 * Renvoie une map { joker_id: purchased } pour les jokers déjà achetés au moins une fois.
 */
export async function getJokerPurchaseCounts(userId: number): Promise<Record<string, number>> {
  const rows = await query<{ joker_id: string; purchased: number }>(
    'SELECT joker_id, purchased FROM user_jokers WHERE user_id = $1 AND purchased > 0',
    [userId],
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.joker_id] = r.purchased;
  return map;
}

/** Quantité possédée d'un joker précis (0 si aucun). */
export async function getJokerQty(userId: number, jokerId: string): Promise<number> {
  const rows = await query<{ qty: number }>(
    'SELECT qty FROM user_jokers WHERE user_id = $1 AND joker_id = $2',
    [userId, jokerId],
  );
  return rows[0]?.qty ?? 0;
}
