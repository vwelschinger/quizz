import { query, withTransaction } from '@/lib/db/pool';
import { BADGES } from '@/lib/badges/catalog';
import { postBonus } from './ledger';
import { BADGE_KOPECKS, BATTLE_KOPECKS, type BattleOutcomeKey } from './rewards';

/**
 * Rétro-crédit UNIQUE des Kopecks pour les badges déjà débloqués et les batailles déjà terminées.
 * Idempotent : ne fait rien si des lignes `*_backfill` existent déjà. Appelé au démarrage du serveur.
 */
export async function backfillKopecksOnce(): Promise<void> {
  const already = await query(
    "SELECT 1 FROM bonus_ledger WHERE reason IN ('badge_backfill', 'battle_backfill') LIMIT 1",
  );
  if (already.length > 0) return;

  await withTransaction(async (client) => {
    // Re-vérification dans la transaction (évite une double exécution concurrente au boot).
    const guard = await client.query(
      "SELECT 1 FROM bonus_ledger WHERE reason IN ('badge_backfill', 'battle_backfill') LIMIT 1",
    );
    if (guard.rows.length > 0) return;

    // 1) Badges déjà débloqués → crédit par palier, agrégé par joueur.
    const tierById = new Map(BADGES.map((b) => [b.id, b.tier]));
    const badgeRows = await client.query<{ user_id: number; badge_id: string }>(
      'SELECT user_id, badge_id FROM user_badges',
    );
    const perUserBadge = new Map<number, number>();
    for (const r of badgeRows.rows) {
      const tier = tierById.get(r.badge_id);
      if (!tier) continue; // badge retiré du catalogue → ignoré
      perUserBadge.set(r.user_id, (perUserBadge.get(r.user_id) ?? 0) + BADGE_KOPECKS[tier]);
    }
    for (const [userId, amount] of perUserBadge) {
      if (amount > 0) await postBonus(client, userId, amount, 'badge_backfill');
    }

    // 2) Batailles terminées → crédit par issue, agrégé par joueur.
    const battleRows = await client.query<{
      challenger_id: number;
      opponent_id: number;
      winner_id: number | null;
    }>("SELECT challenger_id, opponent_id, winner_id FROM battles WHERE status = 'finished'");
    const perUserBattle = new Map<number, number>();
    const add = (userId: number, key: BattleOutcomeKey) =>
      perUserBattle.set(userId, (perUserBattle.get(userId) ?? 0) + BATTLE_KOPECKS[key]);
    for (const b of battleRows.rows) {
      add(b.challenger_id, b.winner_id === b.challenger_id ? 'win' : b.winner_id === b.opponent_id ? 'loss' : 'draw');
      add(b.opponent_id, b.winner_id === b.opponent_id ? 'win' : b.winner_id === b.challenger_id ? 'loss' : 'draw');
    }
    for (const [userId, amount] of perUserBattle) {
      if (amount > 0) await postBonus(client, userId, amount, 'battle_backfill');
    }
  });
}
