-- RevoRun Quizz — ELO de départ abaissé à 800 — migration 004
-- (le câblage applicatif passe par createUser + QUIZZ_CONFIG.startingPlayerElo ;
--  on aligne aussi le défaut du schéma, utilisé par le seed admin.)
ALTER TABLE users ALTER COLUMN elo SET DEFAULT 800;
