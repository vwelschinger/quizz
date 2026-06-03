// Palier (rang) du joueur dérivé de son ELO — affiché dans le bloc héros du dashboard.
// Distinct de la catégorie des questions (Abordable/Expert) : ici c'est le rang du joueur.

export interface PlayerTier {
  name: string;
  floor: number;
  next: number | null; // null si dernier palier
  progress: number; // 0-100 vers le palier suivant
}

const LADDER: { name: string; floor: number }[] = [
  { name: 'NOVICE', floor: 0 },
  { name: 'APPRENTI', floor: 1000 },
  { name: 'CONFIRMÉ', floor: 1200 },
  { name: 'EXPERT', floor: 1400 },
  { name: 'MAÎTRE', floor: 1600 },
  { name: 'LÉGENDE', floor: 1800 },
];

export function playerTier(elo: number): PlayerTier {
  let idx = 0;
  for (let i = 0; i < LADDER.length; i++) {
    if (elo >= LADDER[i].floor) idx = i;
  }
  const current = LADDER[idx];
  const next = LADDER[idx + 1] ?? null;
  const progress = next
    ? Math.round(((elo - current.floor) / (next.floor - current.floor)) * 100)
    : 100;
  return {
    name: current.name,
    floor: current.floor,
    next: next?.floor ?? null,
    progress: Math.max(0, Math.min(100, progress)),
  };
}
