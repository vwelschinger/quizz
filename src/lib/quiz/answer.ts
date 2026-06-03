function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Vrai si la réponse saisie correspond à l'une des réponses acceptées
 * (normalisation accents/casse/espaces). La 1re valeur est la réponse canonique,
 * les suivantes sont des variantes acceptées (cf. `validAnswers` de l'API).
 */
export function isAnswerCorrect(acceptedAnswers: string[], chosen: string): boolean {
  if (!chosen || !chosen.trim()) return false;
  const c = normalize(chosen);
  return acceptedAnswers.some((a) => normalize(a) === c);
}
