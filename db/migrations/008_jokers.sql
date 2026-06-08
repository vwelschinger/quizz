-- RevoRun Quizz — Système de jokers (monnaie « points bonus » dépensable) — migration 008

-- 2.1 — Grand livre des points bonus (crédits positifs, débits négatifs).
-- Le solde dépensable d'un joueur = SUM(delta).
CREATE TABLE IF NOT EXISTS bonus_ledger (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta      INTEGER NOT NULL,            -- >0 crédit, <0 débit
    reason     TEXT NOT NULL,               -- voir enum applicatif (ledger.ts)
    ref_type   TEXT,                        -- 'answer' | 'contestation' | 'joker' | NULL
    ref_id     BIGINT,                      -- id de la ligne liée (facultatif)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_user ON bonus_ledger(user_id);

-- 2.2 — Inventaire de jokers (1 ligne par (user, joker), qty décrémentée à l'usage).
CREATE TABLE IF NOT EXISTS user_jokers (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joker_id TEXT NOT NULL,                 -- id du catalogue (catalog.ts)
    qty      INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
    PRIMARY KEY (user_id, joker_id)
);
CREATE INDEX IF NOT EXISTS idx_user_jokers_user ON user_jokers(user_id);

-- 2.3 — Jokers engagés sur une bataille (aujourd'hui : Fourbe uniquement).
CREATE TABLE IF NOT EXISTS battle_jokers (
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL,
    joker_id  TEXT NOT NULL,
    slot      SMALLINT,                     -- index de la question doublée (0-based), NULL = 1re
    PRIMARY KEY (battle_id, user_id, joker_id)
);

-- 2.4 — Drapeau « a vu la popup d'intro jokers » (persistant, multi-appareils).
ALTER TABLE users ADD COLUMN IF NOT EXISTS seen_jokers_intro BOOLEAN NOT NULL DEFAULT false;

-- Backfill (rétro-crédit) : créditer chaque joueur de tout son bonus déjà accumulé comme solde
-- dépensable. Instantané unique ; les gains suivants créent des lignes incrémentales (solo_answer…).
INSERT INTO bonus_ledger (user_id, delta, reason)
SELECT user_id, COALESCE(SUM(bonus_points), 0), 'migration_backfill'
FROM answers
GROUP BY user_id
HAVING COALESCE(SUM(bonus_points), 0) > 0;
