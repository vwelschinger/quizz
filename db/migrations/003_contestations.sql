-- RevoRun Quizz — Contestations de réponses — migration 003

CREATE TABLE IF NOT EXISTS contestations (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id   INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    chosen_answer TEXT NOT NULL,                  -- la réponse contestée (saisie du joueur)
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ,
    resolved_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (user_id, question_id)                 -- une seule contestation par (joueur, question)
);
CREATE INDEX IF NOT EXISTS idx_contestations_status ON contestations(status);
