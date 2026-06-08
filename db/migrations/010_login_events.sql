-- RevoRun Quizz — Suivi des connexions des utilisateurs — migration 010

CREATE TABLE IF NOT EXISTS login_events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip         TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at DESC);
