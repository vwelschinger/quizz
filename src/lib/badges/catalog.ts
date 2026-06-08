// Catalogue des badges. L'`id` = nom du fichier SVG (public/badge-icons/<id>.svg) ET clé en base.
// Le `tier` reflète la couleur d'anneau du visuel (bronze / argent / or).

import { THEME_BADGES, MULTI_THEME_BADGES } from './themeBadges';

export type BadgeTier = 'bronze' | 'argent' | 'or';

export const BADGE_FAMILIES = [
  'Progression',
  'Précision',
  'Expertise',
  'Rang',
  'Podium',
  'Bataille',
  'Communauté',
  'Régularité',
  'Thème',
] as const;
export type BadgeFamily = (typeof BADGE_FAMILIES)[number];

// Stat d'un thème pour un joueur (forme identique à la sortie de getThemeBreakdown).
export interface ThemeStat {
  theme: string; // libellé EXACT de questions.theme (clé de jointure)
  answered: number; // nb de réponses du joueur dans ce thème
  correct: number; // nb de bonnes réponses
  successRate: number; // 0–100 (pourcentage, pas 0–1)
}

export interface UserBadgeStats {
  answered: number;
  correct: number;
  successRate: number; // %
  bestStreak: number; // plus longue série de bonnes réponses
  elo: number;
  expertCorrect: number; // bonnes réponses sur questions « expert »
  hardCorrect: number; // bonnes réponses sur questions à < 30 % de réussite
  distinctDays: number; // jours distincts joués
  dailyStreak: number; // jours consécutifs joués
  battlesPlayed: number;
  battlesWon: number;
  battleLosses: number;
  bestBattleStreak: number; // plus longue série de victoires de bataille
  perfectBattles: number;
  beatHigherElo: boolean; // a battu un adversaire mieux classé
  facedHigherElo: boolean; // a affronté un adversaire mieux classé
  beatAdmin: boolean;
  maxWinsVsOpponent: number; // victoires max contre un même adversaire
  maxLossesVsOpponent: number; // défaites max contre un même adversaire
  contestationsAccepted: number;
  contestationsTotal: number;
  themeMastered: boolean; // ≥ 15 bonnes réponses dans un même thème
  nightOwl: boolean; // a répondu entre 00 h et 05 h
  weekendWarrior: boolean; // a répondu un week-end
  rank: number | null; // rang actuel au classement ELO (1 = premier) ; null si hors classement (admin)
  themes: ThemeStat[]; // récap par thème — alimente les badges de thème
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  family: BadgeFamily;
  tier: BadgeTier;
  test: (s: UserBadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  // ── Progression (volume de questions) ──
  { id: 'premiers-pas', name: 'Premiers pas', family: 'Progression', tier: 'bronze', description: 'Répondre à 1 question', test: (s) => s.answered >= 1 },
  { id: 'curieux', name: 'Curieux', family: 'Progression', tier: 'bronze', description: 'Répondre à 10 questions', test: (s) => s.answered >= 10 },
  { id: 'mordu', name: 'Mordu', family: 'Progression', tier: 'bronze', description: 'Répondre à 25 questions', test: (s) => s.answered >= 25 },
  { id: 'accro', name: 'Accro', family: 'Progression', tier: 'argent', description: 'Répondre à 100 questions', test: (s) => s.answered >= 100 },
  { id: 'marathonien', name: 'Marathonien', family: 'Progression', tier: 'argent', description: 'Répondre à 250 questions', test: (s) => s.answered >= 250 },
  { id: 'encyclopedie', name: 'Encyclopédie', family: 'Progression', tier: 'or', description: 'Répondre à 500 questions', test: (s) => s.answered >= 500 },
  { id: 'stakhanoviste', name: 'Stakhanoviste', family: 'Progression', tier: 'or', description: 'Répondre à 1000 questions', test: (s) => s.answered >= 1000 },

  // ── Précision (séries de bonnes réponses, taux) ──
  { id: 'bonnet-blanc', name: 'Bonnet blanc', family: 'Précision', tier: 'bronze', description: "5 bonnes réponses d'affilée", test: (s) => s.bestStreak >= 5 },
  { id: 'sans-faute', name: 'Sans-faute', family: 'Précision', tier: 'bronze', description: "10 bonnes réponses d'affilée", test: (s) => s.bestStreak >= 10 },
  { id: 'chirurgien', name: 'Chirurgien', family: 'Précision', tier: 'argent', description: "25 bonnes réponses d'affilée", test: (s) => s.bestStreak >= 25 },
  { id: 'intouchable', name: 'Intouchable', family: 'Précision', tier: 'or', description: "50 bonnes réponses d'affilée", test: (s) => s.bestStreak >= 50 },
  { id: 'tireur-elite', name: "Tireur d'élite", family: 'Précision', tier: 'or', description: '80 % de réussite sur au moins 50 réponses', test: (s) => s.answered >= 50 && s.successRate >= 80 },

  // ── Expertise (questions difficiles / expert / thèmes) ──
  { id: 'coup-de-bol', name: 'Coup de bol', family: 'Expertise', tier: 'bronze', description: 'Réussir 1 question que moins de 30 % réussissent', test: (s) => s.hardCorrect >= 1 },
  { id: 'tete-d-oeuf', name: "Tête d'œuf", family: 'Expertise', tier: 'bronze', description: "5 bonnes réponses sur des questions « expert »", test: (s) => s.expertCorrect >= 5 },
  { id: 'ca-arrive', name: 'Ça arrive', family: 'Expertise', tier: 'bronze', description: 'Se tromper au moins une fois (ça arrive !)', test: (s) => s.answered - s.correct >= 1 },
  { id: 'bete-a-concours', name: 'Bête à concours', family: 'Expertise', tier: 'argent', description: "20 bonnes réponses sur des questions « expert »", test: (s) => s.expertCorrect >= 20 },
  { id: 'monomaniaque', name: 'Monomaniaque', family: 'Expertise', tier: 'argent', description: 'Maîtriser un thème (15 bonnes réponses dans un même thème)', test: (s) => s.themeMastered },
  { id: 'contre-attente', name: 'Contre toute attente', family: 'Expertise', tier: 'or', description: 'Réussir 10 questions que moins de 30 % réussissent', test: (s) => s.hardCorrect >= 10 },
  { id: 'grosse-tete', name: 'Grosse tête', family: 'Expertise', tier: 'or', description: '200 bonnes réponses au total', test: (s) => s.correct >= 200 },
  { id: 'erudit', name: 'Érudit', family: 'Expertise', tier: 'or', description: "50 bonnes réponses sur des questions « expert »", test: (s) => s.expertCorrect >= 50 },

  // ── Rang (ELO) ──
  { id: 'palier-1000', name: 'Confirmé', family: 'Rang', tier: 'bronze', description: 'Atteindre 1000 ELO', test: (s) => s.elo >= 1000 },
  { id: 'palier-1200', name: 'Aguerri', family: 'Rang', tier: 'argent', description: 'Atteindre 1200 ELO', test: (s) => s.elo >= 1200 },
  { id: 'palier-1400', name: 'Maître', family: 'Rang', tier: 'or', description: 'Atteindre 1400 ELO', test: (s) => s.elo >= 1400 },
  { id: 'palier-1600', name: 'Grand maître', family: 'Rang', tier: 'or', description: 'Atteindre 1600 ELO', test: (s) => s.elo >= 1600 },
  { id: 'palier-1800', name: 'Légende', family: 'Rang', tier: 'or', description: 'Atteindre 1800 ELO', test: (s) => s.elo >= 1800 },

  // ── Podium (position au classement ELO, hors admins ; seuils nichés : nº 1 débloque les 3) ──
  { id: 'podium', name: 'Sur le podium', family: 'Podium', tier: 'bronze', description: 'Entrer dans le top 3 du classement', test: (s) => s.rank !== null && s.rank <= 3 },
  { id: 'vice-champion', name: 'Vice-champion', family: 'Podium', tier: 'argent', description: 'Atteindre la 2ᵉ place du classement', test: (s) => s.rank !== null && s.rank <= 2 },
  { id: 'numero-un', name: 'Calife à la place du calife', family: 'Podium', tier: 'or', description: 'Devenir nº 1 du classement', test: (s) => s.rank !== null && s.rank <= 1 },

  // ── Bataille ──
  { id: 'premier-sang', name: 'Premier sang', family: 'Bataille', tier: 'bronze', description: 'Jouer 1 bataille', test: (s) => s.battlesPlayed >= 1 },
  { id: 'casse-cou', name: 'Casse-cou', family: 'Bataille', tier: 'bronze', description: 'Affronter un joueur mieux classé que toi', test: (s) => s.facedHigherElo },
  { id: 'chair-a-canon', name: 'Chair à canon', family: 'Bataille', tier: 'bronze', description: 'Perdre 1 bataille', test: (s) => s.battleLosses >= 1 },
  { id: 'duelliste', name: 'Duelliste', family: 'Bataille', tier: 'argent', description: 'Jouer 10 batailles', test: (s) => s.battlesPlayed >= 10 },
  { id: 'serie-noire', name: 'Série noire', family: 'Bataille', tier: 'argent', description: "5 victoires de bataille d'affilée", test: (s) => s.bestBattleStreak >= 5 },
  { id: 'tueur-en-serie', name: 'Tueur en série', family: 'Bataille', tier: 'argent', description: 'Gagner 10 batailles', test: (s) => s.battlesWon >= 10 },
  { id: 'sans-pitie', name: 'Sans pitié', family: 'Bataille', tier: 'argent', description: 'Gagner une bataille avec un score parfait', test: (s) => s.perfectBattles >= 1 },
  { id: 'souffre-douleur', name: 'Souffre-douleur', family: 'Bataille', tier: 'argent', description: 'Perdre 10 batailles', test: (s) => s.battleLosses >= 10 },
  { id: 'conquerant', name: 'Conquérant', family: 'Bataille', tier: 'or', description: 'Gagner 25 batailles', test: (s) => s.battlesWon >= 25 },
  { id: 'boucher', name: 'Boucher', family: 'Bataille', tier: 'or', description: 'Gagner 50 batailles', test: (s) => s.battlesWon >= 50 },
  { id: 'tombeur', name: 'Tombeur de géant', family: 'Bataille', tier: 'or', description: 'Battre un joueur mieux classé que toi', test: (s) => s.beatHigherElo },
  { id: 'regicide', name: 'Régicide', family: 'Bataille', tier: 'or', description: 'Battre un administrateur', test: (s) => s.beatAdmin },
  { id: 'sac-de-frappe', name: 'Sac de frappe', family: 'Bataille', tier: 'or', description: 'Perdre 25 batailles', test: (s) => s.battleLosses >= 25 },
  { id: 'stockholm', name: 'Syndrome de Stockholm', family: 'Bataille', tier: 'or', description: 'Perdre 3 batailles contre le même joueur', test: (s) => s.maxLossesVsOpponent >= 3 },
  { id: 'insupportable', name: 'Insupportable', family: 'Bataille', tier: 'or', description: 'Battre 3 fois le même joueur', test: (s) => s.maxWinsVsOpponent >= 3 },

  // ── Communauté (contestations) ──
  { id: 'procedurier', name: 'Procédurier', family: 'Communauté', tier: 'bronze', description: 'Déposer 5 contestations', test: (s) => s.contestationsTotal >= 5 },
  { id: 'justicier', name: 'Justicier', family: 'Communauté', tier: 'bronze', description: 'Faire accepter une contestation', test: (s) => s.contestationsAccepted >= 1 },
  { id: 'avocat', name: 'Avocat', family: 'Communauté', tier: 'argent', description: 'Faire accepter 5 contestations', test: (s) => s.contestationsAccepted >= 5 },
  { id: 'jurisprudence', name: 'Jurisprudence', family: 'Communauté', tier: 'or', description: 'Faire accepter 10 contestations', test: (s) => s.contestationsAccepted >= 10 },

  // ── Régularité (jours / horaires) ──
  { id: 'en-feu', name: 'En feu', family: 'Régularité', tier: 'bronze', description: "Jouer 3 jours d'affilée", test: (s) => s.dailyStreak >= 3 },
  { id: 'fidele', name: 'Fidèle', family: 'Régularité', tier: 'bronze', description: 'Jouer sur 7 jours différents', test: (s) => s.distinctDays >= 7 },
  { id: 'metronome', name: 'Métronome', family: 'Régularité', tier: 'argent', description: "Jouer 7 jours d'affilée", test: (s) => s.dailyStreak >= 7 },
  { id: 'oiseau-de-nuit', name: 'Oiseau de nuit', family: 'Régularité', tier: 'argent', description: 'Répondre à une question entre minuit et 5 h', test: (s) => s.nightOwl },
  { id: 'guerrier-du-weekend', name: 'Guerrier du week-end', family: 'Régularité', tier: 'argent', description: 'Répondre à une question un week-end', test: (s) => s.weekendWarrior },
  { id: 'pilier', name: 'Pilier', family: 'Régularité', tier: 'or', description: 'Jouer sur 30 jours différents', test: (s) => s.distinctDays >= 30 },

  // ── Thème (30 badges) + multi-thèmes (6) — générés dans themeBadges.ts ──
  ...THEME_BADGES,
  ...MULTI_THEME_BADGES,
];

export const BADGE_COUNT = BADGES.length;
