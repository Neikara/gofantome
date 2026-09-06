const SGF_ALPHA = 'abcdefghijklmnopqrstuvwxyz';
/** Colonnes du goban : l'alphabet sans le I, convention universelle. */
const COLS = 'ABCDEFGHJKLMNOPQRST';

export const idx = (x: number, y: number, size: number) => y * size + x;
export const xOf = (i: number, size: number) => i % size;
export const yOf = (i: number, size: number) => Math.floor(i / size);

/** "pd" -> index. Retourne null pour un pass ("" ou "tt" en 19x19). */
export function sgfToIndex(s: string, size: number): number | null {
  if (!s || s === 'tt') return null;
  const x = SGF_ALPHA.indexOf(s[0]);
  const y = SGF_ALPHA.indexOf(s[1]);
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return idx(x, y, size);
}

export function indexToSgf(i: number | null, size: number): string {
  if (i === null) return '';
  return SGF_ALPHA[xOf(i, size)] + SGF_ALPHA[yOf(i, size)];
}

/** index -> "Q16". y=0 est la ligne du haut, donc la ligne affichée est size - y. */
export function indexToLabel(i: number | null, size: number): string {
  if (i === null) return 'pass';
  return COLS[xOf(i, size)] + String(size - yOf(i, size));
}

/** "q16" / "Q16" -> index, ou null si illisible. */
export function labelToIndex(label: string, size: number): number | null {
  const m = /^\s*([A-HJ-Ta-hj-t])\s*(\d{1,2})\s*$/.exec(label);
  if (!m) return null;
  const x = COLS.indexOf(m[1].toUpperCase());
  const y = size - parseInt(m[2], 10);
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return idx(x, y, size);
}

/** Points de hoshi, pour le rendu. */
export function hoshi(size: number): number[] {
  if (size < 7) return [];
  const e = size >= 13 ? 3 : 2;
  const m = (size - 1) / 2;
  const lines = size % 2 === 1 ? [e, m, size - 1 - e] : [e, size - 1 - e];
  const pts: number[] = [];
  for (const y of lines) for (const x of lines) pts.push(idx(x, y, size));
  // En 9x9 on ne garde traditionnellement que les 4 coins et le centre.
  if (size === 9) return [idx(2, 2, 9), idx(6, 2, 9), idx(4, 4, 9), idx(2, 6, 9), idx(6, 6, 9)];
  return pts;
}
