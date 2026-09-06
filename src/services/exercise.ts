import type { Sequence, StoredGame } from './model';
import { buildReplay } from '../core/replay';

/**
 * Les exercices enregistrés avant que `lastMove` existe ne le portent pas. On le
 * retrouve depuis la partie d'origine plutôt que par une migration : le SGF est la
 * source de vérité, et un exercice dont la partie a été retirée s'en passe.
 */
const cache = new Map<string, (number | null)[]>();

function movePoints(game: StoredGame): (number | null)[] {
  const known = cache.get(game.id);
  if (known) return known;
  let points: (number | null)[] = [];
  try {
    points = buildReplay(game.sgf).moves.map(m => m.point);
  } catch {
    points = [];
  }
  cache.set(game.id, points);
  return points;
}

/** Dernier coup joué juste avant le début de l'exercice, ou null. */
export function resolveLastMove(seq: Sequence, games: StoredGame[]): number | null {
  if (seq.lastMove !== undefined) return seq.lastMove;
  const at = seq.origin?.moveNumber;
  if (!seq.origin || at === undefined || at <= 0) return null;
  const game = games.find(g => g.id === seq.origin!.gameId);
  if (!game) return null;
  return movePoints(game)[at - 1] ?? null;
}
