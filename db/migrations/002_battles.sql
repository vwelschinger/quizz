-- RevoRun Quizz — Mode Bataille (PvP) — migration 002

CREATE TABLE IF NOT EXISTS battles (
    id                    SERIAL PRIMARY KEY,
    challenger_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_ids          JSONB NOT NULL,                 -- [id, ...] (mêmes questions pour les 2)
    status                TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'finished')),
    challenger_score      INTEGER,
    opponent_score        INTEGER,
    challenger_elo_before INTEGER,
    opponent_elo_before   INTEGER,
    challenger_elo_delta  INTEGER,
    opponent_elo_delta    INTEGER,
    winner_id             INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL = nul ou non résolu
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at           TIMESTAMPTZ,
    CHECK (challenger_id <> opponent_id)
);
CREATE INDEX IF NOT EXISTS idx_battles_challenger ON battles(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent   ON battles(opponent_id);

CREATE TABLE IF NOT EXISTS battle_answers (
    id            BIGSERIAL PRIMARY KEY,
    battle_id     INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id   INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    is_correct    BOOLEAN NOT NULL,
    chosen_answer TEXT,
    answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (battle_id, user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_battle_answers_battle ON battle_answers(battle_id);
