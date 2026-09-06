import type { SrsState } from './model';

/**
 * Répétition espacée, variante simplifiée de SM-2.
 *
 * La qualité d'une révision est déjà produite par les exercices : c'est le rapport
 * `score / max`, entre 0 et 1. Pas de note à saisir à la main, donc, contrairement
 * à Anki : l'exercice mesure lui-même la réussite.
 *
 * `now` est injectable partout, ce qui permet de simuler des semaines de révisions
 * dans un test sans attendre.
 */

export const DAY_MS = 86_400_000;

/** En dessous, les intervalles s'effondrent et la carte revient sans cesse. */
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const START_EASE = 2.5;

/**
 * Au-delà d'un an, l'intervalle n'a plus de sens ici : une séquence jamais revue
 * depuis si longtemps mérite un rappel, même si elle avait été parfaitement acquise.
 */
const MAX_INTERVAL_DAYS = 365;

/** Seuil de réussite : en dessous, la séquence n'est pas acquise. */
const PASS = 0.6;
/** Au-dessus, la révision compte comme aisée. */
const EASY = 0.9;

export const newSrs = (now: number = Date.now()): SrsState => ({
  due: now,
  intervalDays: 0,
  ease: START_EASE,
  reps: 0,
  lapses: 0,
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Calcule le nouvel état après une révision.
 *
 * Les deux premières réussites ont un intervalle fixe (1 puis 3 jours) : tant qu'une
 * séquence vient d'être apprise, la multiplier par `ease` l'enverrait trop loin.
 * Ensuite seulement l'intervalle devient multiplicatif.
 */
export function review(srs: SrsState, quality: number, now: number = Date.now()): SrsState {
  const q = clamp(quality, 0, 1);

  if (q < PASS) {
    return {
      due: now + DAY_MS,
      intervalDays: 1,
      ease: Math.max(MIN_EASE, srs.ease - 0.2),
      // On repart au début de l'échelle des intervalles, mais on garde la trace de l'oubli.
      reps: 0,
      lapses: srs.lapses + 1,
    };
  }

  let intervalDays: number;
  if (srs.reps === 0) intervalDays = 1;
  else if (srs.reps === 1) intervalDays = 3;
  else {
    const grown = Math.round(srs.intervalDays * (q >= EASY ? srs.ease : 1.2));
    intervalDays = clamp(grown, 1, MAX_INTERVAL_DAYS);
  }

  let ease = srs.ease;
  if (q >= 1) ease = Math.min(MAX_EASE, srs.ease + 0.1);
  else if (q < EASY) ease = Math.max(MIN_EASE, srs.ease - 0.15);

  return {
    due: now + intervalDays * DAY_MS,
    intervalDays,
    ease,
    reps: srs.reps + 1,
    lapses: srs.lapses,
  };
}

/** Qualité d'un essai : la part de coups réussis. */
export const quality = (score: number, max: number) => (max > 0 ? clamp(score / max, 0, 1) : 0);

export const isDue = (srs: SrsState, now: number = Date.now()) => srs.due <= now;

/** Échéance en clair, pour l'interface. */
export function dueLabel(due: number, now: number = Date.now()): string {
  const diff = due - now;
  if (diff <= 0) return 'à réviser';
  const days = Math.ceil(diff / DAY_MS);
  if (days === 1) return 'demain';
  if (days < 31) return `dans ${days} jours`;
  const months = Math.round(days / 30);
  return months === 1 ? 'dans un mois' : `dans ${months} mois`;
}
