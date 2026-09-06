import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Goban, { type Flash } from './Goban';
import { indexToLabel } from '../core/coords';
import { uid, type Attempt, type Sequence } from '../services/model';
import type { DrillProps } from './BlindDrill';

const TICKS = 3;
const TICK_MS = 700;

type Phase = 'brief' | 'countdown' | 'playing' | 'done';

function setupStones(seq: Sequence): Uint8Array {
  const stones = new Uint8Array(seq.size * seq.size);
  for (const p of seq.setup.black) stones[p] = 1;
  for (const p of seq.setup.white) stones[p] = 2;
  return stones;
}

/**
 * « Coup à corriger » : une position, un coup, quelques secondes.
 *
 * Contrairement à la lecture à l'aveugle, la position reste entièrement visible pendant
 * la réponse — mais elle n'apparaît qu'au départ du chrono. La montrer avant laisserait
 * le temps de calculer, et on travaillerait la lecture au lieu de l'intuition.
 */
export default function GuessDrill({
  sequence: seq, onFinish, best = null, lastMove = null, aside, afterActions, autoStart = false,
}: DrillProps) {
  // autoStart : la file de révision enchaîne les exercices, on ne repasse pas par le briefing.
  const [phase, setPhase] = useState<Phase>(autoStart ? 'countdown' : 'brief');
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [countdown, setCountdown] = useState(TICKS);
  const [result, setResult] = useState<Attempt | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const stones = useMemo(() => setupStones(seq), [seq]);
  const empty = useMemo(() => new Uint8Array(seq.size * seq.size), [seq.size]);
  const expected = seq.moves[0];
  const accepted = useMemo(
    () => new Set([expected?.point, ...(seq.accept ?? [])].filter(p => p !== null && p !== undefined)),
    [expected, seq.accept],
  );

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const addFlash = useCallback((point: number, color: 1 | 2, tone: Flash['tone'], ms: number) => {
    const key = `${point}-${tone}-${Math.random().toString(36).slice(2)}`;
    setFlashes(f => [...f, { key, point, color, tone, durationMs: ms }]);
    timers.current.push(window.setTimeout(() => {
      setFlashes(f => f.filter(x => x.key !== key));
    }, ms + 80));
  }, []);

  const finish = useCallback((correct: boolean, timedOut: boolean) => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    const attempt: Attempt = {
      id: uid(),
      seqId: seq.id,
      mode: 'guess',
      at: Date.now(),
      max: 1,
      score: correct ? 1 : 0,
      errors: correct ? 0 : 1,
      durationMs: Date.now() - startedAt.current,
      timedOut,
      errorAt: correct ? [] : [1],
    };
    setResult(attempt);
    setPhase('done');
    onFinish(attempt);
  }, [seq, onFinish]);

  const begin = useCallback(() => {
    clearTimers();
    finished.current = false;
    setFlashes([]);
    setResult(null);
    setPicked(null);
    setCountdown(TICKS);
    setPhase('countdown');
  }, []);

  // Même mécanique que la lecture à l'aveugle : la phase pilote les minuteries.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const ids: number[] = [];
    for (let i = 1; i <= TICKS; i++) {
      ids.push(window.setTimeout(() => setCountdown(TICKS - i), i * TICK_MS));
    }
    ids.push(window.setTimeout(() => {
      startedAt.current = Date.now();
      setRemaining(seq.timerSeconds * 1000);
      setPhase('playing');
    }, TICKS * TICK_MS));
    return () => ids.forEach(clearTimeout);
  }, [phase, seq.timerSeconds]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const limit = seq.timerSeconds * 1000;
    const iv = setInterval(() => {
      const left = limit - (Date.now() - startedAt.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) finish(false, true);
    }, 100);
    return () => clearInterval(iv);
  }, [phase, seq, finish]);

  useEffect(() => clearTimers, []);

  const answer = useCallback((point: number) => {
    if (phase !== 'playing' || !expected) return;
    setPicked(point);
    const correct = accepted.has(point);
    const ms = Math.max(300, seq.flashMs);
    addFlash(point, expected.color, correct ? 'correct' : 'error', ms);
    if (!correct && expected.point !== null) {
      later(() => addFlash(expected.point as number, expected.color, 'correct', ms), 240);
    }
    later(() => finish(correct, false), correct ? 260 : 500);
  }, [phase, expected, accepted, seq.flashMs, addFlash, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (e.target instanceof HTMLElement && /input|textarea|button/i.test(e.target.tagName)) return;
      e.preventDefault();
      if (phase === 'brief' || phase === 'done') begin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, begin]);

  const limitMs = seq.timerSeconds * 1000;
  const ratio = phase === 'playing' ? remaining / limitMs : 1;
  const barClass = ratio < 0.25 ? 'critical' : ratio < 0.5 ? 'warn' : '';

  // La position n'est révélée qu'une fois le chrono lancé.
  const hidden = phase === 'brief' || phase === 'countdown';
  const solved = phase === 'done' && expected?.point !== null && expected !== undefined;

  return (
    <div className="split">
      <div>
        <div className="board-wrap">
          <Goban
            size={seq.size}
            stones={hidden ? empty : stones}
            flashes={flashes}
            ghosts={solved ? [
              { point: expected.point as number, color: expected.color, label: '✓', tone: 'good' as const },
              ...(seq.accept ?? []).map(pt => ({
                point: pt, color: expected.color, label: '+', tone: 'good' as const,
              })),
              // Le coup joué dans la partie n'apparaît que s'il diffère de la réponse :
              // c'est tout l'intérêt d'un exercice bâti sur une erreur.
              ...(seq.playedInGame !== null && seq.playedInGame !== undefined
                  && seq.playedInGame !== expected.point
                ? [{ point: seq.playedInGame, color: expected.color, label: '✗', tone: 'bad' as const }]
                : []),
            ] : []}
            lastMove={hidden ? null : lastMove}
            cursor={phase === 'playing' && expected ? expected.color : null}
            onPoint={phase === 'playing' ? answer : undefined}
            muted={phase === 'done'}
          />
        </div>

        {phase === 'countdown' && <div className="countdown">{countdown || 'Go'}</div>}

        {phase === 'playing' && (
          <>
            <div className={`timer-bar ${barClass}`}>
              <div style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="toolbar">
              <span className="mono">{(remaining / 1000).toFixed(1)}s</span>
              <span className="tag">{expected?.color === 1 ? 'Noir' : 'Blanc'} au trait</span>
              <span className="muted small">un seul coup, sans calculer</span>
            </div>
          </>
        )}

        {phase !== 'playing' && phase !== 'countdown' && (
          <div className="toolbar">
            <button className="primary" onClick={begin}>
              {phase === 'done' ? 'Recommencer' : 'Commencer'} (Espace)
            </button>
            {afterActions}
          </div>
        )}
      </div>

      <aside>
        {phase === 'brief' && (
          <div className="card">
            <h3>L'exercice</h3>
            <p className="small muted">
              La position apparaîtra après le décompte. Tu as {seq.timerSeconds} secondes
              pour poser <strong>un seul coup</strong>, à l'instinct.
            </p>
            <p className="small muted">
              Ne cherche pas à lire : si tu calcules, tu travailles autre chose. Retrouve le
              coup que tu as désigné comme bon ; les variantes que tu as acceptées comptent aussi.
            </p>
            {seq.notes && <div className="banner info small">{seq.notes}</div>}
            <div className="stat-row" style={{ marginTop: '.8rem' }}>
              <div className="stat"><div className="k">Temps</div><div className="v">{seq.timerSeconds}s</div></div>
              <div className="stat"><div className="k">Record</div><div className="v">{best ?? '—'}</div></div>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="card">
            <h3>Résultat</h3>
            <div className={`banner ${result.score ? 'ok' : 'bad'}`}>
              {result.score
                ? 'Trouvé.'
                : result.timedOut
                  ? 'Temps écoulé.'
                  : `Raté — tu as joué ${indexToLabel(picked, seq.size)}.`}
            </div>
            <div className="stat-row" style={{ marginTop: '.8rem' }}>
              <div className="stat">
                <div className="k">{seq.playedInGame !== undefined && seq.playedInGame !== null ? 'Bonne réponse' : 'Coup joué'}</div>
                <div className="v" style={{ fontSize: '1.1rem' }}>
                  {expected ? indexToLabel(expected.point, seq.size) : '—'}
                </div>
              </div>
              <div className="stat">
                <div className="k">Temps</div>
                <div className="v">{(result.durationMs / 1000).toFixed(1)}s</div>
              </div>
            </div>
            {seq.playedInGame !== undefined && seq.playedInGame !== null
              && seq.playedInGame !== expected?.point && (
              <p className="small muted" style={{ marginTop: '.7rem', marginBottom: 0 }}>
                Dans la partie, <strong>{indexToLabel(seq.playedInGame, seq.size)}</strong> avait
                été joué (marqué ✗).
              </p>
            )}
            {seq.origin && (
              <p className="small muted" style={{ marginTop: '.5rem', marginBottom: 0 }}>
                Coup {seq.origin.moveNumber + 1} de {seq.origin.gameLabel}.
              </p>
            )}
          </div>
        )}

        {aside}
      </aside>
    </div>
  );
}
