import type { PoolClient } from 'pg';
import { query } from '@/lib/db/pool';

// Grand livre des points bonus. Le solde DÉPENSABLE d'un joueur = SUM(bonus_ledger.delta).
// À ne pas confondre avec le `totalBonus` historique (SUM(answers.bonus_points), jamais débité).

export type BonusReason =
  | 'solo_answer' // +Kopecks d'une bonne réponse solo
  | 'contestation' // +Kopecks recrédités par une contestation acceptée
  | 'migration_backfill' // crédit initial (rétro-crédit du bonus historique)
  | 'joker_purchase' // −prix d'un achat de joker
  | 'balle_dans_le_pied' // +Kopecks issus de la conversion ELO→Kopecks
  | 'recyclage' // +Kopecks issus du recyclage d'un joker
  | 'badge_grant' // +Kopecks au déblocage d'un badge
  | 'battle_grant' // +Kopecks à la résolution d'une bataille
  | 'badge_backfill' // rétro-crédit unique des badges déjà débloqués
  | 'battle_backfill' // rétro-crédit unique des batailles déjà terminées
  | 'admin_adjust'; // ajustement manuel du solde par un admin

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

export interface JokerPurchaseRow {
  id: number;
  username: string;
  jokerId: string;
  price: number;
  createdAt: string;
}

/** Journal des achats de jokers (récents d'abord) pour la console admin. */
export async function listRecentJokerPurchases(limit = 50): Promise<JokerPurchaseRow[]> {
  const rows = await query<{
    id: number;
    username: string;
    joker_id: string;
    price: number;
    created_at: Date;
  }>(
    `SELECT jp.id, u.username, jp.joker_id, jp.price, jp.created_at
       FROM joker_purchases jp
       JOIN users u ON u.id = jp.user_id
      ORDER BY jp.created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    jokerId: r.joker_id,
    price: r.price,
    createdAt: r.created_at.toISOString(),
  }));
}

/** Nombre total d'achats de jokers enregistrés. */
export async function countJokerPurchases(): Promise<number> {
  const rows = await query<{ n: number }>('SELECT count(*)::int AS n FROM joker_purchases');
  return rows[0]?.n ?? 0;
}
