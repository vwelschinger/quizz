-- RevoRun Quizz — Activité des joueurs + journal des achats de jokers — migration 011

-- Dernière activité (mise à jour à chaque action authentifiée, throttlée).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Journal des achats de jokers (qui / quel joker / prix payé / quand).
CREATE TABLE IF NOT EXISTS joker_purchases (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joker_id   TEXT NOT NULL,
    price      INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_joker_purchases_user ON joker_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_joker_purchases_created ON joker_purchases(created_at DESC);
