-- RevoRun Quizz — schéma initial (base "quizz")
-- Idempotent (CREATE ... IF NOT EXISTS). Appliqué par scripts/migrate.mjs.

-- Suivi des migrations appliquées
CREATE TABLE IF NOT EXISTS _migrations (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Utilisateurs (l'admin provisionne les comptes ; pas d'inscription ouverte)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    elo           INTEGER NOT NULL DEFAULT 1200,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions (cookie httpOnly -> token ; révocables, expirent)
CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Questions scrappées de "La Table des Savoirs"
CREATE TABLE IF NOT EXISTS questions (
    id                     SERIAL PRIMARY KEY,
    source_id              TEXT UNIQUE,                    -- id côté La Table des Savoirs (idempotence)
    quiz_date              DATE,                           -- jour du quiz d'origine
    category               TEXT NOT NULL CHECK (category IN ('abordable', 'expert')),
    theme                  TEXT,
    prompt                 TEXT NOT NULL,                  -- énoncé de la question
    choices                JSONB,                          -- options (QCM) ; NULL si réponse libre
    accepted_answers       JSONB,                          -- réponses acceptées (validAnswers) ; [0] = canonique
    correct_answer         TEXT NOT NULL,                  -- réponse canonique (validAnswers[0])
    explanation            TEXT,                           -- explication éventuelle
    community_success_rate NUMERIC(5, 2),                  -- taux de réussite communautaire (0-100 %)
    difficulty             TEXT CHECK (difficulty IN ('high', 'middle', 'low')),
    question_elo           INTEGER NOT NULL DEFAULT 1200,  -- ELO caché de la question
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_category  ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_elo       ON questions(question_elo);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_date ON questions(quiz_date);

-- Historique des réponses (1 réponse par (user, question) — flux question unique)
CREATE TABLE IF NOT EXISTS answers (
    id            BIGSERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id   INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    is_correct    BOOLEAN NOT NULL,
    chosen_answer TEXT,
    elo_before    INTEGER NOT NULL,
    elo_after     INTEGER NOT NULL,
    elo_delta     INTEGER NOT NULL,
    question_elo  INTEGER NOT NULL,                        -- snapshot de l'ELO question au moment de la réponse
    bonus_points  INTEGER NOT NULL DEFAULT 0,
    answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);

-- Réglages applicatifs (token API rotable, état de synchro, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
