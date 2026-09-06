import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Goban, { type Flash } from './Goban';
import { indexToLabel } from '../core/coords';
import { uid, type Attempt, type Sequence } from '../services/model';

/** Décompte avant le départ de l'exercice. */
const TICKS = 3;
const TICK_MS = 700;

type Phase = 'brief' | 'countdown' | 'playing' | 'done';

export interface DrillProps {
  sequence: Sequence;
  onFinish: (attempt: Attempt) => void;
  /** Meilleur score connu, affiché dans le briefing. */
  best?: number | null;
  /** Dernier coup joué avant la position de départ, marqué sur le plateau. */
  lastMove?: number | null;
  /** Contenu ajouté en bas de la colonne de droite (réglages, historique, session…). */
  aside?: ReactNode;
  /** Boutons ajoutés après un essai, par exemple « Suivant » en révision. */
  afterActions?: ReactNode;
  /** Démarre sans attendre un clic : utile quand on enchaîne une file. */
  autoStart?: boolean;
}

/** Position de départ : elle reste affichée pendant tout l'exercice. */
function setupStones(seq: Sequence): Uint8Array {
  const stones = new Uint8Array(seq.size * seq.size);
  for (const p of seq.setup.black) stones[p] = 1;
  for (const p of seq.setup.white) stones[p] = 2;
  return stones;
}

export default function BlindDrill({
  sequence: seq, onFinish, best = null, lastMove = null, aside, afterActions, autoStart = false,
}: DrillProps) {
  // autoStart : la file de révision enchaîne les exercices, on ne repasse pas par le briefing.
  const [phase, setPhase] = useState<Phase>(autoStart ? 'countdown' : 'brief');
  const [step, setStep] = useState(0);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [countdown, setCountdown] = useState(TICKS);
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<Attempt | null>(null);
  /** Intersection cliquée à tort, montrée à la correction. */
  const [wrong, setWrong] = useState<number | null>(null);

  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);
  const stepRef = useRef(0);
  const finished = useRef(false);

  const stones = useMemo(() => setupStones(seq), [seq]);
  const total = seq.moves.length;

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const addFlash = useCallback((point: number, color: 1 | 2, tone: Flash['tone'], ms: number) => {
    const key = `${point}-${tone}-${Math.random().toString(36).slice(2)}`;
    setFlashes(f => [...f, { key, point, color, tone, durationMs: ms }]);
    timers.current.push(window.setTimeout(() => {
      setFlashes(f => f.filter(x => x.key !== key));
    }, ms + 80));
  }, []);

  /**
   * Une seule erreur suffit à perdre l'essai : c'est le principe de la lecture, une
   * séquence tenue à moitié ne se joue pas sur le goban. `reached` mesure quand même
   * jusqu'où on est allé, ce qui reste une information utile d'un essai à l'autre.
   */
  const finish = useCallback((reached: number, failed: boolean, timedOut: boolean) => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    const attempt: Attempt = {
      id: uid(),
      seqId: seq.id,
      mode: 'blind',
      at: Date.now(),
      max: seq.moves.length,
      errors: failed ? 1 : 0,
      score: reached,
      durationMs: Date.now() - startedAt.current,
      timedOut,
      errorAt: failed ? [reached + 1] : [],
    };
    setResult(attempt);
    setPhase('done');
    onFinish(attempt);
  }, [seq, onFinish]);

  const begin = useCallback(() => {
    clearTimers();
    finished.current = false;
    stepRef.current = 0;
    setStep(0);
    setFlashes([]);
    setResult(null);
    setWrong(null);
    setReveal(false);
    setCountdown(TICKS);
    setPhase('countdown');
  }, []);

  // Le décompte est piloté par la phase : les minuteries sont posées ici, jamais
  // pendant un rendu, et sont nettoyées si l'exercice change en cours de route.
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

  // Chronomètre.
  useEffect(() => {
    if (phase !== 'playing') return;
    const limit = seq.timerSeconds * 1000;
    const iv = setInterval(() => {
      const left = limit - (Date.now() - startedAt.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) finish(stepRef.current, false, true);
    }, 100);
    return () => clearInterval(iv);
  }, [phase, seq, finish]);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => clearTimers, []);

  const answer = useCallback((point: number | null) => {
    if (phase !== 'playing') return;
    const expected = seq.moves[step];
    if (!expected) return;
    const ms = Math.max(120, seq.flashMs);

    if (point !== expected.point) {
      if (point !== null) {
        setWrong(point);
        addFlash(point, expected.color, 'error', ms);
      }
      // On laisse voir l'erreur avant de dévoiler la séquence entière.
      later(() => finish(step, true, false), 500);
      return;
    }

    if (point !== null) addFlash(point, expected.color, 'normal', ms);
    const next = step + 1;
    stepRef.current = next;
    setStep(next);
    if (next >= seq.moves.length) later(() => finish(next, false, false), Math.min(ms, 450));
  }, [seq, phase, step, addFlash, finish]);

  // Espace : démarrer ou recommencer.
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
  const barClass = ratio < 0.15 ? 'critical' : ratio < 0.4 ? 'warn' : '';

  /**
   * En fin d'essai la séquence est toujours dévoilée, réussie ou non : voir les pierres
   * numérotées à leur place est ce qui fixe la lecture, bien plus qu'un verdict écrit.
   */
  const showAll = phase === 'done' || (phase === 'brief' && reveal);
  const ghosts = showAll
    ? [
        ...seq.moves
          .filter(m => m.point !== null)
          .map((m, i) => ({
            point: m.point as number,
            color: m.color,
            label: i + 1,
            tone: result && i === result.score && result.errors > 0 ? ('good' as const) : undefined,
          })),
        ...(wrong !== null ? [{ point: wrong, color: seq.moves[step]?.color ?? 1, label: '✗', tone: 'bad' as const }] : []),
      ]
    : [];

  const expected = seq.moves[step];
  const clickable = phase === 'playing';

  return (
    <div className="split">
      <div>
        <div className="board-wrap">
          <Goban
            size={seq.size}
            stones={stones}
            flashes={flashes}
            ghosts={ghosts}
            lastMove={phase === 'done' ? null : lastMove}
            cursor={clickable && expected ? expected.color : null}
            onPoint={clickable ? answer : undefined}
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
              <span className="muted small">coup {step + 1} / {total}</span>
              <span className="tag">{expected?.color === 1 ? 'Noir' : 'Blanc'} au trait</span>
              <button className="sm" onClick={() => answer(null)}>Passe</button>
              <button className="sm danger" onClick={() => finish(stepRef.current, false, true)}>
                Abandonner
              </button>
            </div>
          </>
        )}

        {phase !== 'playing' && phase !== 'countdown' && (
          <div className="toolbar">
            <button className="primary" onClick={begin}>
              {phase === 'done' ? 'Recommencer' : 'Commencer'} (Espace)
            </button>
            {phase === 'brief' && (
              <button onClick={() => setReveal(r => !r)}>
                {reveal ? 'Cacher la solution' : 'Voir la solution'}
              </button>
            )}
            {afterActions}
          </div>
        )}
      </div>

      <aside>
        {phase === 'brief' && (
          <div className="card">
            <h3>L'exercice</h3>
            <p className="small muted">
              Le plateau ci-contre est la position de départ : elle reste affichée.
              Rejoue la séquence de mémoire, en cliquant. Chaque pierre posée clignote
              puis disparaît — à toi de tenir la position dans ta tête.
            </p>
            <p className="small muted">
              <strong>Une seule erreur et l'essai est perdu :</strong> la séquence
              s'affiche en entier, et il faut la reprendre du début.
            </p>
            {seq.notes && <div className="banner info small">{seq.notes}</div>}
            <div className="stat-row" style={{ marginTop: '.8rem' }}>
              <div className="stat"><div className="k">Coups</div><div className="v">{total}</div></div>
              <div className="stat"><div className="k">Temps</div><div className="v">{seq.timerSeconds}s</div></div>
              <div className="stat"><div className="k">Record</div><div className="v">{best ?? '—'}</div></div>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="card">
            <h3>Résultat</h3>
            <div className={`banner ${result.errors === 0 && !result.timedOut ? 'ok' : 'bad'}`}>
              {result.errors === 0 && !result.timedOut
                ? 'Séquence complète, sans faute.'
                : result.timedOut
                  ? `Temps écoulé au coup ${result.score + 1}.`
                  : `Raté au coup ${result.score + 1} — c'était ${indexToLabel(seq.moves[result.score]?.point ?? null, seq.size)}.`}
            </div>
            <p className="small muted" style={{ marginTop: '.7rem' }}>
              La séquence est affichée sur le plateau, numérotée dans l'ordre.
              {result.errors > 0 && ' Ton coup est marqué ✗.'}
            </p>
            <div className="stat-row">
              <div className="stat">
                <div className="k">Coups tenus</div>
                <div className={`v ${result.score === result.max ? 'good' : result.score < result.max * 0.6 ? 'bad' : ''}`}>
                  {result.score}<span className="muted" style={{ fontSize: '.8rem' }}>/{result.max}</span>
                </div>
              </div>
              <div className="stat"><div className="k">Temps</div><div className="v">{(result.durationMs / 1000).toFixed(1)}s</div></div>
              <div className="stat"><div className="k">Record</div><div className="v">{best ?? result.score}</div></div>
            </div>
          </div>
        )}

        <div className="card">
          <h3>La séquence</h3>
          <div className="movelist">
            {seq.moves.map((m, i) => {
              const failedHere = phase === 'done' && result !== null && result.errors > 0 && i === result.score;
              const state = phase === 'playing' || phase === 'done'
                ? (i < step ? 'done' : failedHere ? 'wrong' : i === step && phase === 'playing' ? 'current' : 'pending')
                : 'pending';
              const hidden = phase === 'playing' || (phase === 'brief' && !reveal);
              return (
                <span key={i} className={`movechip ${m.color === 1 ? 'b' : 'w'} ${state}`}>
                  {i + 1}. {hidden ? '···' : indexToLabel(m.point, seq.size)}
                </span>
              );
            })}
          </div>
        </div>

        {aside}
      </aside>
    </div>
  );
}
