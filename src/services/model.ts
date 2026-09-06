import type { Color } from '../core/types';

export interface StoredGame {
  /** "ogs:88868859" ou "sgf:<timestamp>" */
  id: string;
  source: 'ogs' | 'sgf';
  sourceId: string;
  sgf: string;
  addedAt: number;
  meta: {
    name: string;
    size: number;
    komi: number;
    handicap: number;
    result: string;
    date: string;
    black: string;
    blackRank: string;
    white: string;
    whiteRank: string;
    moveCount: number;
  };
}

export interface SeqMove {
  /** index sur le goban, null = pass */
  point: number | null;
  color: Color;
}

export interface Sequence {
  id: string;
  name: string;
  createdAt: number;
  size: number;
  /** Position visible pendant l'exercice, en indices. */
  setup: { black: number[]; white: number[] };
  moves: SeqMove[];
  /** D'où vient la séquence, pour pouvoir y revenir. */
  origin?: { gameId: string; gameLabel: string; moveNumber: number };
  /** Secondes allouées pour rejouer la séquence entière. */
  timerSeconds: number;
  /** Durée d'affichage d'une pierre posée, en ms. */
  flashMs: number;
  notes?: string;
}

export interface Attempt {
  id: string;
  seqId: string;
  at: number;
  /** moves.length - errors */
  score: number;
  max: number;
  errors: number;
  /** ms réellement utilisées */
  durationMs: number;
  /** true si le chrono a expiré avant la fin */
  timedOut: boolean;
  /** Numéros de coups (1-based) où il y a eu une erreur. */
  errorAt: number[];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Temps par défaut : généreux au début de la séquence, resserré ensuite. */
export const defaultTimer = (moveCount: number) => Math.max(15, Math.round(moveCount * 4));
