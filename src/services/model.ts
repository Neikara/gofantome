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

/**
 * Comment un exercice est restitué. Le contenu ne suffit pas à le décrire : la même
 * position travaille la lecture ou l'intuition selon la façon dont on la sert.
 */
export type DrillMode = 'blind' | 'guess';

export const MODE_LABELS: Record<DrillMode, string> = {
  blind: 'Lecture à l’aveugle',
  guess: 'Deviner le coup',
};

/** État de répétition espacée. Voir srs.ts pour la mécanique. */
export interface SrsState {
  /** Prochaine échéance (timestamp). */
  due: number;
  intervalDays: number;
  /** Facteur SM-2, plancher 1.3. */
  ease: number;
  reps: number;
  lapses: number;
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
  mode: DrillMode;
  /** Classes libres et cumulables : « pince », « hoshi », « mon répertoire »… */
  tags: string[];
  srs: SrsState;
  /**
   * Réponses supplémentaires acceptées au premier coup, pour « deviner le coup ».
   * Vide tant qu'on ne lit pas les coups suggérés par KataGo.
   */
  accept?: number[];
}

export interface Attempt {
  id: string;
  seqId: string;
  mode: DrillMode;
  at: number;
  /** Nombre de coups joués juste : les coups jamais atteints ne comptent pas. */
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

/**
 * Une devinette doit se jouer à l'instinct : laisser le temps de calculer reviendrait
 * à travailler la lecture, pas l'intuition.
 */
export const GUESS_TIMER_SECONDS = 5;
