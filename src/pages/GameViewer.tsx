import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Goban from '../components/Goban';
import { useStore } from '../state/store';
import { buildReplay, turnAfter } from '../core/replay';
import { play } from '../core/board';
import { indexToLabel } from '../core/coords';
import type { Color, Position } from '../core/types';
import { defaultTimer, uid, GUESS_TIMER_SECONDS, type SeqMove, type Sequence } from '../services/model';
import { newSrs } from '../services/srs';

interface Recording {
  /** Coup de la partie à partir duquel la séquence commence. */
  startAt: number;
  moves: SeqMove[];
  /** positions[i] = plateau après i coups de la séquence. */
  positions: Position[];
}

export default function GameViewer() {
  const { id = '' } = useParams();
  const gameId = decodeURIComponent(id);
  const navigate = useNavigate();

  const game = useStore(s => s.games.find(g => g.id === gameId));
  // Le selecteur doit renvoyer une reference stable : on filtre en dehors du store.
  const allSequences = useStore(s => s.sequences);
  const addSequence = useStore(s => s.addSequence);
  const addSequences = useStore(s => s.addSequences);
  const sequences = useMemo(
    () => allSequences.filter(s2 => s2.origin?.gameId === gameId),
    [allSequences, gameId],
  );

  const [cursor, setCursor] = useState(0);
  const [rec, setRec] = useState<Recording | null>(null);
  const [flip, setFlip] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [timer, setTimer] = useState(30);
  const [flashMs, setFlashMs] = useState(400);
  const [guessColor, setGuessColor] = useState<'both' | 'black' | 'white'>('both');
  const [guessCount, setGuessCount] = useState(5);
  const [notice, setNotice] = useState<string | null>(null);

  const replay = useMemo(() => {
    if (!game) return null;
    try { return buildReplay(game.sgf); } catch { return null; }
  }, [game]);

  const total = replay?.moves.length ?? 0;

  // Navigation au clavier dans la partie.
  useEffect(() => {
    if (rec) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') setCursor(c => Math.max(0, c - (e.shiftKey ? 10 : 1)));
      if (e.key === 'ArrowRight') setCursor(c => Math.min(total, c + (e.shiftKey ? 10 : 1)));
      if (e.key === 'Home') setCursor(0);
      if (e.key === 'End') setCursor(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, rec]);

  useEffect(() => {
    if (!problem) return;
    const t = setTimeout(() => setProblem(null), 2500);
    return () => clearTimeout(t);
  }, [problem]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  // En enregistrement, on numérote les coups de la séquence sur le plateau.
  const markers = useMemo(() => {
    if (!rec) return undefined;
    const final = rec.positions[rec.moves.length];
    const m = new Map<number, number>();
    rec.moves.forEach((mv, i) => {
      if (mv.point !== null && final.stones[mv.point] !== 0) m.set(mv.point, i + 1);
    });
    return m;
  }, [rec]);

  // Le temps par défaut suit la longueur de la séquence tant que l'utilisateur n'y touche pas.
  const recMoveCount = rec?.moves.length ?? 0;
  const touchedTimer = useRef(false);
  useEffect(() => {
    if (recMoveCount > 0 && !touchedTimer.current) setTimer(defaultTimer(recMoveCount));
  }, [recMoveCount]);

  if (!game) {
    return (
      <main className="page">
        <div className="empty">
          Partie introuvable. <Link to="/">Retour à la bibliothèque</Link>
        </div>
      </main>
    );
  }

  if (!replay) {
    return (
      <main className="page">
        <div className="banner bad">Le SGF de cette partie n'a pas pu être relu.</div>
      </main>
    );
  }

  const size = replay.info.size;
  const gameLabel = `${game.meta.black} vs ${game.meta.white}`;

  const startTurn: Color = rec ? turnAfter(replay, rec.startAt) : turnAfter(replay, cursor);
  const recTurn: Color = rec
    ? (rec.moves.length % 2 === 0 ? startTurn : (startTurn === 1 ? 2 : 1))
    : startTurn;
  const nextColor: Color = flip ? (recTurn === 1 ? 2 : 1) : recTurn;

  const displayed = rec ? rec.positions[rec.moves.length] : replay.positions[cursor];
  const lastMove = rec ? null : (cursor > 0 ? replay.moves[cursor - 1].point : null);

  const startRecording = () => {
    setRec({ startAt: cursor, moves: [], positions: [replay.positions[cursor]] });
    setName(`${gameLabel} — coup ${cursor + 1}`);
    setFlip(false);
    touchedTimer.current = false;
    setTimer(30);
  };

  const cancelRecording = () => { setRec(null); setProblem(null); };

  const onPoint = (point: number) => {
    if (!rec) return;
    const from = rec.positions[rec.moves.length];
    const res = play(from, point, nextColor);
    if (!res.ok) {
      setProblem(res.reason === 'occupied' ? 'Intersection déjà occupée.'
        : res.reason === 'ko' ? 'Interdit par le ko.'
        : 'Coup suicidaire.');
      return;
    }
    setRec({
      ...rec,
      moves: [...rec.moves, { point, color: nextColor }],
      positions: [...rec.positions, res.position],
    });
    setFlip(false);
  };

  const undo = () => {
    if (!rec || !rec.moves.length) return;
    setRec({ ...rec, moves: rec.moves.slice(0, -1), positions: rec.positions.slice(0, -1) });
  };

  const addPass = () => {
    if (!rec) return;
    const from = rec.positions[rec.moves.length];
    setRec({
      ...rec,
      moves: [...rec.moves, { point: null, color: nextColor }],
      positions: [...rec.positions, { ...from, ko: null }],
    });
  };

  /** Reprend les coups réellement joués dans la partie, à partir du point de départ. */
  const takeFromGame = (count: number) => {
    if (!rec) return;
    let pos = rec.positions[rec.moves.length];
    const moves = [...rec.moves];
    const positions = [...rec.positions];
    let taken = 0;
    for (let i = rec.startAt + moves.length; i < total && taken < count; i++) {
      const mv = replay.moves[i];
      const res = play(pos, mv.point, mv.color);
      if (!res.ok) break;
      pos = res.position;
      moves.push({ point: mv.point, color: mv.color });
      positions.push(pos);
      taken++;
    }
    if (!taken) { setProblem('Plus de coups à reprendre dans la partie.'); return; }
    setRec({ ...rec, moves, positions });
  };

  /** Sépare les pierres d'une position en deux listes d'indices. */
  const splitStones = (at: number) => {
    const start = replay.positions[at];
    const black: number[] = [];
    const white: number[] = [];
    for (let i = 0; i < start.stones.length; i++) {
      if (start.stones[i] === 1) black.push(i);
      else if (start.stones[i] === 2) white.push(i);
    }
    return { black, white };
  };

  const save = async () => {
    if (!rec || !rec.moves.length) return;
    const seqId = uid();
    await addSequence({
      id: seqId,
      name: name.trim() || `${gameLabel} — coup ${rec.startAt + 1}`,
      createdAt: Date.now(),
      size,
      setup: splitStones(rec.startAt),
      moves: rec.moves,
      origin: { gameId, gameLabel, moveNumber: rec.startAt },
      timerSeconds: timer,
      flashMs,
      mode: 'blind',
      tags: [],
      srs: newSrs(),
    });
    setRec(null);
    navigate(`/train/${seqId}`);
  };

  /**
   * Crée des exercices « deviner le coup » à partir des coups réellement joués.
   * Aucune IA nécessaire : dans une partie de joueur fort, le coup joué est la référence.
   */
  const createGuesses = async (count: number) => {
    const created: Sequence[] = [];
    const now = Date.now();
    for (let at = cursor; at < total && created.length < count; at++) {
      const mv = replay.moves[at];
      // On ne fait pas deviner un pass, et on respecte la couleur demandée.
      if (mv.point === null) continue;
      if (guessColor !== 'both' && mv.color !== (guessColor === 'black' ? 1 : 2)) continue;
      created.push({
        id: uid(),
        name: `${gameLabel} — coup ${at + 1}`,
        createdAt: now - created.length,
        size,
        setup: splitStones(at),
        moves: [{ point: mv.point, color: mv.color }],
        origin: { gameId, gameLabel, moveNumber: at },
        timerSeconds: GUESS_TIMER_SECONDS,
        flashMs: 400,
        mode: 'guess',
        tags: [],
        srs: newSrs(now),
      });
    }
    if (!created.length) { setProblem('Aucun coup à transformer en devinette ici.'); return; }
    await addSequences(created);
    if (created.length === 1) navigate(`/train/${created[0].id}`);
    else setNotice(`${created.length} devinettes créées, prêtes dans la file de révision.`);
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>{gameLabel}</h1>
          <p className="sub">
            {size}×{size} · {total} coups
            {replay.info.result && ` · ${replay.info.result}`}
            {replay.info.handicap > 0 && ` · handicap ${replay.info.handicap}`}
            {` · komi ${replay.info.komi}`}
            {game.source === 'ogs' && (
              <> · <a href={`https://online-go.com/game/${game.sourceId}`} target="_blank" rel="noreferrer">voir sur OGS</a></>
            )}
          </p>
        </div>
        <Link className="btn sm" to="/" style={{ marginLeft: 'auto' }}>Bibliothèque</Link>
      </div>

      <div className="split">
        <div>
          <div className="board-wrap">
            <Goban
              size={size}
              stones={displayed.stones}
              markers={markers}
              lastMove={lastMove}
              cursor={rec ? nextColor : null}
              onPoint={rec ? onPoint : undefined}
            />
          </div>

          {!rec ? (
            <>
              <div className="toolbar">
                <button onClick={() => setCursor(0)} disabled={cursor === 0}>⏮</button>
                <button onClick={() => setCursor(c => Math.max(0, c - 10))} disabled={cursor === 0}>−10</button>
                <button onClick={() => setCursor(c => Math.max(0, c - 1))} disabled={cursor === 0}>◀</button>
                <span className="mono" style={{ minWidth: 92, textAlign: 'center' }}>
                  {cursor} / {total}
                </span>
                <button onClick={() => setCursor(c => Math.min(total, c + 1))} disabled={cursor === total}>▶</button>
                <button onClick={() => setCursor(c => Math.min(total, c + 10))} disabled={cursor === total}>+10</button>
                <button onClick={() => setCursor(total)} disabled={cursor === total}>⏭</button>
              </div>
              <input
                type="range" min={0} max={total} value={cursor}
                onChange={e => setCursor(Number(e.target.value))}
                style={{ marginTop: '.6rem', padding: 0 }}
              />
              <p className="small muted" style={{ textAlign: 'center', marginTop: '.4rem' }}>
                Flèches ← → pour naviguer (Maj pour 10 coups).
              </p>
            </>
          ) : (
            <div className="toolbar">
              <button onClick={undo} disabled={!rec.moves.length}>Annuler le dernier</button>
              <button onClick={addPass}>Passe</button>
              <button onClick={() => setFlip(f => !f)}>
                Poser une pierre {nextColor === 1 ? 'noire' : 'blanche'}
              </button>
              <button onClick={() => takeFromGame(1)}>+1 coup de la partie</button>
              <button onClick={() => takeFromGame(5)}>+5</button>
            </div>
          )}

          {problem && <div className="banner bad" style={{ marginTop: '.7rem' }}>{problem}</div>}
          {notice && (
            <div className="banner ok" style={{ marginTop: '.7rem' }}>
              {notice} <Link to="/review">Réviser maintenant</Link>
            </div>
          )}
        </div>

        <aside>
          {!rec ? (
            <>
              <div className="card">
                <h3>Enregistrer une séquence</h3>
                <p className="small muted">
                  Place-toi sur la position qui t'intéresse, puis pose la variation que tu veux apprendre à lire.
                  Les pierres déjà sur le plateau resteront visibles pendant l'exercice.
                </p>
                <button className="primary" onClick={startRecording} style={{ width: '100%' }}>
                  Enregistrer depuis le coup {cursor}
                </button>
              </div>

              <div className="card">
                <h3>Deviner le coup</h3>
                <p className="small muted">
                  Le coup réellement joué devient la réponse. À faire sur les parties de
                  joueurs plus forts que toi : c'est leur intuition que tu copies.
                </p>
                <div className="row">
                  <div className="field grow" style={{ minWidth: 90 }}>
                    <label htmlFor="g-count">Combien</label>
                    <input
                      id="g-count" type="number" min={1} max={50} value={guessCount}
                      onChange={e => setGuessCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="field grow" style={{ minWidth: 110 }}>
                    <label htmlFor="g-color">Coups de</label>
                    <select
                      id="g-color" value={guessColor}
                      onChange={e => setGuessColor(e.target.value as typeof guessColor)}
                    >
                      <option value="both">Les deux</option>
                      <option value="black">Noir</option>
                      <option value="white">Blanc</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <button className="grow" onClick={() => void createGuesses(1)} disabled={cursor >= total}>
                    Ce coup seul
                  </button>
                  <button className="primary grow" onClick={() => void createGuesses(guessCount)} disabled={cursor >= total}>
                    Créer {guessCount}
                  </button>
                </div>
              </div>

              {cursor > 0 && replay.moves[cursor - 1].comment && (
                <div className="card">
                  <h3>Commentaire</h3>
                  <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {replay.moves[cursor - 1].comment}
                  </p>
                </div>
              )}

              <div className="card">
                <h3>Séquences de cette partie <span className="tag">{sequences.length}</span></h3>
                {sequences.length === 0 ? (
                  <p className="small muted" style={{ margin: 0 }}>Aucune pour l'instant.</p>
                ) : (
                  <div className="list">
                    {sequences.map(s => (
                      <div key={s.id} className="item" style={{ padding: '.5rem .6rem' }}>
                        <div className="main">
                          <div className="title" style={{ fontSize: '.85rem' }}>{s.name}</div>
                          <div className="meta">
                            <span>{s.moves.length} coups</span>
                            <span>coup {(s.origin?.moveNumber ?? 0) + 1}</span>
                          </div>
                        </div>
                        <div className="actions">
                          <button className="sm" onClick={() => setCursor(s.origin?.moveNumber ?? 0)}>Voir</button>
                          <Link className="btn sm primary" to={`/train/${s.id}`}>Jouer</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Nouvelle séquence</h3>
              <p className="small muted">
                Départ : coup {rec.startAt} · au trait : {nextColor === 1 ? 'Noir' : 'Blanc'}
              </p>

              <div className="movelist" style={{ margin: '.6rem 0' }}>
                {rec.moves.length === 0 && <span className="small muted">Clique sur le goban pour poser les coups.</span>}
                {rec.moves.map((m, i) => (
                  <span key={i} className={`movechip ${m.color === 1 ? 'b' : 'w'}`}>
                    {i + 1}. {indexToLabel(m.point, size)}
                  </span>
                ))}
              </div>

              <div className="field">
                <label htmlFor="seq-name">Nom</label>
                <input id="seq-name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="row">
                <div className="field grow">
                  <label htmlFor="seq-timer">Temps alloué (s)</label>
                  <input id="seq-timer" type="number" min={5} max={600} value={timer}
                         onChange={e => { touchedTimer.current = true; setTimer(Number(e.target.value)); }} />
                </div>
                <div className="field grow">
                  <label htmlFor="seq-flash">Pierre visible (ms)</label>
                  <input id="seq-flash" type="number" min={0} max={3000} step={50} value={flashMs}
                         onChange={e => setFlashMs(Number(e.target.value))} />
                </div>
              </div>

              <div className="row">
                <button className="primary grow" onClick={() => void save()} disabled={!rec.moves.length}>
                  Enregistrer et s'entraîner
                </button>
                <button onClick={cancelRecording}>Annuler</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
