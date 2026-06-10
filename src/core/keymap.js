// Mappe les touches physiques vers des positions normalisées (0..1) sur le clavier.
// u = gauche->droite, v = haut(fond)->bas(devant). On les projette ensuite
// sur la boîte englobante du mesh pour obtenir un point monde.
// Disposition AZERTY simplifiée, 5 rangées.

const ROWS = [
  '²&é"\'(-è_çà)=',
  'azertyuiop^$',
  'qsdfghjklmù*',
  'wxcvbn,;:!',
  ' ', // barre espace (gérée à part, large et centrée)
];

// Construit une table { 'a': {u, v}, ... }
function buildMap() {
  const map = {};
  const nRows = ROWS.length;
  for (let r = 0; r < nRows; r++) {
    const row = ROWS[r];
    const v = nRows === 1 ? 0.5 : r / (nRows - 1);
    if (row.trim() === '') {
      map[' '] = { u: 0.5, v: 0.96 };
      continue;
    }
    const cols = row.length;
    // léger décalage façon clavier
    const stagger = r * 0.018;
    for (let c = 0; c < cols; c++) {
      const u = cols === 1 ? 0.5 : (c / (cols - 1)) * 0.9 + 0.05 + stagger;
      map[row[c]] = { u: Math.min(0.98, u), v };
    }
  }
  return map;
}

const KEY_MAP = buildMap();

// Retourne un uv normalisé pour une touche, ou null si inconnue.
export function keyToUV(key) {
  if (!key) return null;
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === ' ' || key === 'Spacebar' || key === 'Space') return KEY_MAP[' '];
  return KEY_MAP[k] ?? null;
}

// Pour les touches non mappées (Enter, Shift…), on renvoie une zone plausible
// pour que l'expérience réagisse quand même.
export function keyToUVLoose(key) {
  const exact = keyToUV(key);
  if (exact) return exact;
  // hash stable -> point pseudo-aléatoire mais constant par touche
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return { u: 0.1 + (h % 1000) / 1000 * 0.8, v: 0.1 + ((h >> 10) % 1000) / 1000 * 0.8 };
}
