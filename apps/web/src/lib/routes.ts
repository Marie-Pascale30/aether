/**
 * Adresses des pages de jeu. Ce sont des pages fixes à paramètre (et non `/mondes/[slug]`) :
 * une seule page à garder pour le hors ligne, et compatible avec un export statique (applis).
 */
export const worldHref = (slug: string) => `/monde?m=${encodeURIComponent(slug)}`;
export const levelHref = (id: string) => `/enigme?id=${encodeURIComponent(id)}`;
