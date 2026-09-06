import { type Color, type Position, other } from './types';
import { xOf, yOf, idx } from './coords';

export function emptyPosition(size: number): Position {
  return { size, stones: new Uint8Array(size * size), ko: null, captures: { black: 0, white: 0 } };
}

export function neighbors(i: number, size: number): number[] {
  const x = xOf(i, size), y = yOf(i, size);
  const n: number[] = [];
  if (x > 0) n.push(i - 1);
  if (x < size - 1) n.push(i + 1);
  if (y > 0) n.push(i - size);
  if (y < size - 1) n.push(i + size);
  return n;
}

/** Chaîne connexe contenant `i`, et ses libertés. */
export function group(stones: Uint8Array, size: number, i: number): { points: number[]; liberties: number } {
  const color = stones[i];
  const points: number[] = [];
  const seen = new Uint8Array(stones.length);
  const libSeen = new Uint8Array(stones.length);
  let liberties = 0;
  const stack = [i];
  seen[i] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    points.push(p);
    for (const n of neighbors(p, size)) {
      if (stones[n] === 0) {
        if (!libSeen[n]) { libSeen[n] = 1; liberties++; }
      } else if (stones[n] === color && !seen[n]) {
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  return { points, liberties };
}

export type PlayResult =
  | { ok: true; position: Position; captured: number[] }
  | { ok: false; reason: 'occupied' | 'suicide' | 'ko' };

/** Joue un coup en renvoyant une nouvelle position. `point` null = pass. */
export function play(pos: Position, point: number | null, color: Color): PlayResult {
  if (point === null) {
    return { ok: true, position: { ...pos, stones: pos.stones, ko: null }, captured: [] };
  }
  if (pos.stones[point] !== 0) return { ok: false, reason: 'occupied' };
  if (pos.ko === point) return { ok: false, reason: 'ko' };

  const stones = Uint8Array.from(pos.stones);
  stones[point] = color;
  const enemy = other(color);
  const captured: number[] = [];

  for (const n of neighbors(point, pos.size)) {
    if (stones[n] === enemy) {
      const g = group(stones, pos.size, n);
      if (g.liberties === 0) {
        for (const p of g.points) { stones[p] = 0; captured.push(p); }
      }
    }
  }

  if (captured.length === 0 && group(stones, pos.size, point).liberties === 0) {
    return { ok: false, reason: 'suicide' };
  }

  // Ko simple : une pierre capturée par une pierre isolée à une seule liberté.
  let ko: number | null = null;
  if (captured.length === 1 && group(stones, pos.size, point).points.length === 1
      && group(stones, pos.size, point).liberties === 1) {
    ko = captured[0];
  }

  const captures = { ...pos.captures };
  if (color === 1) captures.black += captured.length; else captures.white += captured.length;

  return { ok: true, position: { size: pos.size, stones, ko, captures }, captured };
}

/** Pose des pierres sans capture ni tour de jeu (AB/AW du SGF, handicap). */
export function addStones(pos: Position, points: number[], color: Color): Position {
  const stones = Uint8Array.from(pos.stones);
  for (const p of points) stones[p] = color;
  return { ...pos, stones };
}

/** Pierres de handicap standard, pour les parties OGS sans AB explicite. */
export function handicapPoints(size: number, count: number): number[] {
  if (count < 2 || size < 7) return [];
  const e = size >= 13 ? 3 : 2;
  const m = (size - 1) / 2, last = size - 1 - e;
  const P = (x: number, y: number) => idx(x, y, size);
  const order = [P(last, e), P(e, last), P(last, last), P(e, e), P(e, m), P(last, m), P(m, e), P(m, last), P(m, m)];
  if (count === 5 || count === 7) {
    const base = order.slice(0, count - 1);
    return [...base, P(m, m)];
  }
  return order.slice(0, Math.min(count, 9));
}
