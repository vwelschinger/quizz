// Catalogue des jokers. L'`id` est GELÉ : il sert de clé `user_jokers`/`battle_jokers` ET de nom de
// fichier SVG (public/jokers/<id>.svg). Les libellés de façade (`name`) peuvent évoluer librement.

export type JokerCategory = 'offensif' | 'defensif' | 'utilitaire'; // pilote la couleur (cf. design)
export type JokerScope = 'solo' | 'battle';
export type JokerKind = 'consumable' | 'conversion';

export interface JokerDef {
  id: string;
  name: string;
  description: string;
  category: JokerCategory;
  scope: JokerScope; // inerte pour les conversions (non jouées en partie)
  kind: JokerKind;
  price: number | null; // coût de base en bonus (null pour les conversions)
}

/** Facteur global sur la grille de prix (1 = grille de la spec). Ajustable pour rendre les jokers plus rares/fréquents. */
export const JOKER_PRICE_FACTOR = 1;

/** Constantes des conversions (cf. spec §4.2). */
export const JOKER_CONSTANTS = {
  BALLE_ELO_COST: 100,
  BALLE_BONUS_GAIN: 1000,
  BALLE_ELO_FLOOR: 100,
  RECYCLAGE_RATE: 1 / 3,
} as const;

export const JOKER_CATEGORIES: { id: JokerCategory; label: string }[] = [
  { id: 'offensif', label: 'Offensif' },
  { id: 'defensif', label: 'Défensif' },
  { id: 'utilitaire', label: 'Utilitaire' },
];

export const JOKERS: JokerDef[] = [
  // ───────── Consommables (achetés, stockés, activés) ─────────
  {
    id: 'esquive',
    name: 'Esquive',
    description:
      "Passe la question sans y répondre : aucun impact sur ton ELO, ton bonus ni tes stats. La question pourra revenir plus tard.",
    category: 'defensif',
    scope: 'solo',
    kind: 'consumable',
    price: 1200,
  },
  {
    id: 'gilet-pare-balles',
    name: 'Gilet pare-balles',
    description:
      "Si ta réponse est fausse, ta perte d'ELO est ramenée à zéro. Ne se consomme que s'il te sauve : réponse juste = gilet rendu.",
    category: 'defensif',
    scope: 'solo',
    kind: 'consumable',
    price: 2500,
  },
  {
    id: 'cafeine',
    name: 'Caféine',
    description:
      "Multiplie par 2 la variation d'ELO de la question — gain ET perte. Le bonus n'est pas affecté. Pari engagé.",
    category: 'offensif',
    scope: 'solo',
    kind: 'consumable',
    price: 3000,
  },
  {
    id: 'seconde-chance',
    name: 'Seconde chance',
    description:
      "1re réponse fausse ? Tente un 2e essai sans voir la solution. 2e essai juste : ELO et bonus comptés à moitié. 2e essai faux : perte pleine.",
    category: 'defensif',
    scope: 'solo',
    kind: 'consumable',
    price: 3500,
  },
  {
    id: 'fourbe',
    name: 'Fourbe',
    description: 'En bataille, ta 1re question compte double. De quoi renverser un duel serré.',
    category: 'offensif',
    scope: 'battle',
    kind: 'consumable',
    price: 4500,
  },
  {
    id: 'dopage',
    name: 'Dopage',
    description:
      "Multiplie par 3 la variation d'ELO de la question — gain ET perte. Le bonus n'est pas affecté. Pari très engagé.",
    category: 'offensif',
    scope: 'solo',
    kind: 'consumable',
    price: 6000,
  },

  // ───────── Conversions (actions instantanées, pas d'inventaire) ─────────
  {
    id: 'balle-dans-le-pied',
    name: 'Balle dans le pied',
    description:
      'Sacrifie 100 points d’ELO pour gagner 1000 points bonus. Répétable, refusée si elle te ferait passer sous 100 ELO.',
    category: 'utilitaire',
    scope: 'solo',
    kind: 'conversion',
    price: null,
  },
  {
    id: 'recyclage',
    name: 'Recyclage',
    description: 'Recycle un joker que tu possèdes contre le tiers de son prix en points bonus.',
    category: 'utilitaire',
    scope: 'solo',
    kind: 'conversion',
    price: null,
  },
];

export function getJoker(id: string): JokerDef | undefined {
  return JOKERS.find((j) => j.id === id);
}

/** Prix effectif d'un joker (après facteur global). `null` pour les conversions. */
export function jokerPrice(def: JokerDef): number | null {
  return def.price == null ? null : Math.round(def.price * JOKER_PRICE_FACTOR);
}
