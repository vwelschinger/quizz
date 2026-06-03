-- RevoRun Quizz — Contestations de bataille + lien de notification — migration 006

-- Une contestation peut concerner une réponse de bataille (sinon NULL = solo).
ALTER TABLE contestations ADD COLUMN IF NOT EXISTS battle_id INTEGER REFERENCES battles(id) ON DELETE CASCADE;

-- Une notification peut pointer vers une page (ex : /bataille/123).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
