-- RevoRun Quizz — Notifications utilisateur — migration 005

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,                 -- 'contest_accepted' | 'contest_rejected'
    prompt      TEXT,                          -- énoncé de la question concernée
    elo_delta   INTEGER NOT NULL DEFAULT 0,    -- évolution d'ELO liée à la notif
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
