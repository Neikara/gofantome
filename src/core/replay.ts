import { parseSgf, readGameInfo, mainLine, type SgfGame } from './sgf';
import { emptyPosition, play, addStones, handicapPoints } from './board';
import { sgfToIndex } from './coords';
import type { Color, Position } from './types';

export interface ReplayMove {
  point: number | null;
  color: Color;
  comment?: string;
}

export interface Replay {
  info: SgfGame;
  moves: ReplayMove[];
  /** positions[n] = plateau après n coups. positions[0] = position de départ. */
  positions: Position[];
  /** Pierres posées d'entrée, en indices (handicap / position initiale). */
  setup: { black: number[]; white: number[] };
  /** Coups que le moteur a refusés, s'il y en a. */
  warnings: string[];
}

export function buildReplay(sgfText: string): Replay {
  const root = parseSgf(sgfText);
  const info = readGameInfo(root);
  const size = info.size;

  const toIdx = (s: string) => sgfToIndex(s, size);
  const setupBlack = info.setup.black.map(toIdx).filter((v): v is number => v !== null);
  const setupWhite = info.setup.white.map(toIdx).filter((v): v is number => v !== null);

  let pos = emptyPosition(size);
  if (setupBlack.length) pos = addStones(pos, setupBlack, 1);
  if (setupWhite.length) pos = addStones(pos, setupWhite, 2);
  // OGS omet parfois AB et ne donne que HA : on reconstruit le placement standard.
  if (!setupBlack.length && info.handicap >= 2) {
    const pts = handicapPoints(size, info.handicap);
    setupBlack.push(...pts);
    pos = addStones(pos, pts, 1);
  }

  const moves: ReplayMove[] = [];
  const positions: Position[] = [pos];
  const warnings: string[] = [];

  for (const m of mainLine(root)) {
    const point = m.sgf === '' ? null : toIdx(m.sgf);
    const res = play(pos, point, m.color);
    if (!res.ok) {
      warnings.push(`Coup ${moves.length + 1} ignoré (${res.reason}).`);
      continue;
    }
    pos = res.position;
    moves.push({ point, color: m.color, comment: m.comment });
    positions.push(pos);
  }

  return { info, moves, positions, setup: { black: setupBlack, white: setupWhite }, warnings };
}

/** Couleur qui a le trait après n coups. */
export function turnAfter(replay: Replay, n: number): Color {
  if (n > 0) return replay.moves[n - 1].color === 1 ? 2 : 1;
  return replay.setup.black.length > replay.setup.white.length ? 2 : 1;
}
