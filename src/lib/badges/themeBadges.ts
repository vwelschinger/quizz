// Badges par thème (30 = 10 thèmes × 3 niveaux) + badges multi-thèmes (6).
// Générés depuis une table de données ; évalués par le moteur existant (checkAndAwardBadges).
// N'importe de catalog.ts QUE des types (import type) → pas de cycle runtime.

import type { BadgeDef, BadgeTier, ThemeStat, UserBadgeStats } from './catalog';

// Index 0 = bronze, 1 = argent, 2 = or. Seuils cumulatifs (volume ET %).
export const THEME_BADGE_TIERS: { tier: BadgeTier; minAnswered: number; minRate: number }[] = [
  { tier: 'bronze', minAnswered: 10, minRate: 50 },
  { tier: 'argent', minAnswered: 25, minRate: 70 },
  { tier: 'or', minAnswered: 50, minRate: 85 },
];

export const MULTI_THEME_THRESHOLDS = {
  toucheATout: 5, // thèmes JOUÉS (≥1 réponse)
  tousAzimuts: 10, // thèmes JOUÉS
  polyvalent: 3, // thèmes au niveau BRONZE
  pentathlonien: 5, // thèmes au niveau ARGENT
  espritUniversel: 3, // thèmes au niveau OR
  equilibristeMinThemes: 5, // min. de thèmes "sérieux"
  equilibristeMinAnswered: 10, // seuil "thème sérieux"
  equilibristeMinRate: 60, // % requis dans CHAQUE thème sérieux
};

interface ThemeBadgeRow {
  slug: string;
  theme: string;
  names: [string, string, string];
}

// ⚠️ `theme` doit correspondre EXACTEMENT à questions.theme en base (vérifié sur le VPS).
const THEME_BADGE_DEFS: ThemeBadgeRow[] = [
  { slug: 'animaux-et-plantes', theme: 'Animaux et plantes', names: ['Ami des bestioles', 'Chuchoteur de bêtes', 'Roi de la jungle'] },
  { slug: 'classique', theme: 'Classique', names: ['Rat de bibliothèque', 'Dévoreur de pavés', 'Plume d’or'] },
  { slug: 'culture-generale', theme: 'Culture générale', names: ['Tête chercheuse', 'Puits de savoir', 'Cerveau sur pattes'] },
  { slug: 'geographie', theme: 'Géographie', names: ['Lecteur de cartes', 'Arpenteur du monde', 'GPS humain'] },
  { slug: 'histoire', theme: 'Histoire', names: ['Chasseur de reliques', 'Gardien des chroniques', 'Seigneur du temps'] },
  { slug: 'jeux-video-culture-web', theme: 'Jeux-vidéo / Culture Web', names: ['Noob repenti', 'Pro-gamer', 'Boss final'] },
  { slug: 'moderne', theme: 'Moderne', names: ['Branché', 'Accro au scroll', 'Oracle du buzz'] },
  { slug: 'musiques', theme: 'Musiques', names: ['Chanteur sous la douche', 'Oreille absolue', 'Maestro'] },
  { slug: 'sciences', theme: 'Sciences', names: ['Petit chimiste', 'Savant fou', 'Cerveau de Nobel'] },
  { slug: 'sport', theme: 'Sport', names: ['Sportif du dimanche', 'Crack du stade', 'Légende du stade'] },
];

// Un thème est "atteint" au niveau d'index `i` si volume ET % sont satisfaits.
export function themeTierReached(t: ThemeStat | undefined, i: number): boolean {
  if (!t) return false;
  const lvl = THEME_BADGE_TIERS[i];
  return t.answered >= lvl.minAnswered && t.successRate >= lvl.minRate;
}

const findTheme = (s: UserBadgeStats, theme: string): ThemeStat | undefined =>
  s.themes.find((x) => x.theme === theme);

// 30 BadgeDef : id = theme-<slug>-<niveau> (niveau ∈ {1,2,3}).
export const THEME_BADGES: BadgeDef[] = THEME_BADGE_DEFS.flatMap((row) =>
  THEME_BADGE_TIERS.map((lvl, i) => ({
    id: `theme-${row.slug}-${i + 1}`,
    name: row.names[i],
    family: 'Thème' as const,
    tier: lvl.tier,
    description: `≥ ${lvl.minAnswered} réponses en ${row.theme} avec ≥ ${lvl.minRate} % de réussite`,
    test: (s: UserBadgeStats) => themeTierReached(findTheme(s, row.theme), i),
  })),
);

// Données prêtes pour l'UI (sous-groupage par thème) — évite de parser les id côté page.
export const THEME_BADGE_GROUPS = THEME_BADGE_DEFS.map((row) => ({
  slug: row.slug,
  theme: row.theme,
  badges: THEME_BADGE_TIERS.map(
    (_, i) => THEME_BADGES.find((b) => b.id === `theme-${row.slug}-${i + 1}`)!,
  ),
}));

const themesPlayed = (s: UserBadgeStats) => s.themes.filter((t) => t.answered >= 1).length;
const countTierReached = (s: UserBadgeStats, i: number) =>
  s.themes.filter((t) => themeTierReached(t, i)).length;

const M = MULTI_THEME_THRESHOLDS;

export const MULTI_THEME_BADGES: BadgeDef[] = [
  {
    id: 'touche-a-tout',
    name: 'Touche-à-tout',
    family: 'Thème',
    tier: 'bronze',
    description: `Répondre dans ≥ ${M.toucheATout} thèmes différents`,
    test: (s) => themesPlayed(s) >= M.toucheATout,
  },
  {
    id: 'tous-azimuts',
    name: 'Tous azimuts',
    family: 'Thème',
    tier: 'argent',
    description: `Répondre dans ≥ ${M.tousAzimuts} thèmes différents`,
    test: (s) => themesPlayed(s) >= M.tousAzimuts,
  },
  {
    id: 'polyvalent',
    name: 'Couteau suisse',
    family: 'Thème',
    tier: 'argent',
    description: `Atteindre le niveau bronze dans ≥ ${M.polyvalent} thèmes`,
    test: (s) => countTierReached(s, 0) >= M.polyvalent,
  },
  {
    id: 'pentathlonien',
    name: 'Cinq sur cinq',
    family: 'Thème',
    tier: 'or',
    description: `Atteindre le niveau argent dans ≥ ${M.pentathlonien} thèmes`,
    test: (s) => countTierReached(s, 1) >= M.pentathlonien,
  },
  {
    id: 'esprit-universel',
    name: 'Polymathe de poche',
    family: 'Thème',
    tier: 'or',
    description: `Atteindre le niveau or dans ≥ ${M.espritUniversel} thèmes`,
    test: (s) => countTierReached(s, 2) >= M.espritUniversel,
  },
  {
    id: 'equilibriste',
    name: 'Funambule',
    family: 'Thème',
    tier: 'or',
    description:
      `≥ ${M.equilibristeMinRate} % de réussite dans chaque thème joué ` +
      `(min. ${M.equilibristeMinThemes} thèmes, ≥ ${M.equilibristeMinAnswered} réponses chacun)`,
    test: (s) => {
      const serious = s.themes.filter((t) => t.answered >= M.equilibristeMinAnswered);
      return (
        serious.length >= M.equilibristeMinThemes &&
        serious.every((t) => t.successRate >= M.equilibristeMinRate)
      );
    },
  },
];
