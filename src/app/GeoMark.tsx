// Icônes géométriques pleines (iconographie constructiviste), partagées par le dashboard,
// les tuiles de thème et la fiche joueur.

export type Shape = 'square' | 'ring' | 'tri' | 'star';

export function GeoMark({
  shape,
  color = '#1A1611',
  size = 16,
}: {
  shape: Shape;
  color?: string;
  size?: number;
}) {
  if (shape === 'square')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <rect x="2" y="2" width="12" height="12" fill={color} />
      </svg>
    );
  if (shape === 'ring')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    );
  if (shape === 'tri')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <path d="M8 1l7 13H1z" fill={color} />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 0l2.2 5.8L16 8l-5.8 2.2L8 16l-2.2-5.8L0 8l5.8-2.2z" fill={color} />
    </svg>
  );
}

const SHAPES: Shape[] = ['square', 'ring', 'tri', 'star'];
const COLORS = ['#1E6499', '#165080', '#5391c2', '#1A1611'];

/**
 * Associe à un thème (texte libre) une icône déterministe (forme + couleur), via un hash simple
 * du nom. Deux thèmes différents tendent vers des visuels distincts, et un même thème garde
 * toujours la même icône d'une page à l'autre.
 */
export function themeMark(theme: string): { shape: Shape; color: string } {
  let h = 0;
  for (let i = 0; i < theme.length; i++) {
    h = (h * 31 + theme.charCodeAt(i)) >>> 0;
  }
  return {
    shape: SHAPES[h % SHAPES.length],
    color: COLORS[Math.floor(h / SHAPES.length) % COLORS.length],
  };
}
