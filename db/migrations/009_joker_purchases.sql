-- RevoRun Quizz — Prix progressif des jokers : compteur d'achats par (joueur, joker) — migration 009

-- Nombre d'achats déjà effectués de ce joker par ce joueur (ne diminue JAMAIS, contrairement à qty).
-- Le prix du prochain achat = prix_base × 1,3^purchased (arrondi à la dizaine inférieure).
ALTER TABLE user_jokers ADD COLUMN IF NOT EXISTS purchased INTEGER NOT NULL DEFAULT 0;

-- Baseline pour les jokers déjà possédés avant cette migration : on suppose au moins `qty` achats.
UPDATE user_jokers SET purchased = qty WHERE purchased = 0 AND qty > 0;
