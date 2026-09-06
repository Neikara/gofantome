import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Drill from '../components/Drill';
import GuessEditor, { type GuessAnswer } from '../components/GuessEditor';
import { useStore } from '../state/store';
import { MODE_LABELS, MODE_TAG_CLASS, type Attempt } from '../services/model';
import { dueLabel } from '../services/srs';
import { resolveLastMove } from '../services/exercise';

export default function Trainer() {
  const { id = '' } = useParams();
  const seq = useStore(s => s.sequences.find(x => x.id === id));
  // Filtrer dans le sélecteur créerait un nouveau tableau à chaque rendu.
  const allAttempts = useStore(s => s.attempts);
  const games = useStore(s => s.games);
  const recordAttempt = useStore(s => s.recordAttempt);
  const updateSequence = useStore(s => s.updateSequence);
  const attempts = useMemo(() => allAttempts.filter(a => a.seqId === id), [allAttempts, id]);
  const [editing, setEditing] = useState(false);

  const onFinish = useCallback((a: Attempt) => { void recordAttempt(a); }, [recordAttempt]);

  // Les exercices d'avant ce champ n'ont pas de dernier coup : on le retrouve dans la partie.
  const lastMove = useMemo(() => (seq ? resolveLastMove(seq, games) : null), [seq, games]);

  // Position de départ de l'exercice, reconstruite pour l'éditeur de réponse.
  const stones = useMemo(() => {
    const out = new Uint8Array((seq?.size ?? 19) ** 2);
    for (const p of seq?.setup.black ?? []) out[p] = 1;
    for (const p of seq?.setup.white ?? []) out[p] = 2;
    return out;
  }, [seq]);

  if (!seq) {
    return (
      <main className="page">
        <div className="empty">Séquence introuvable. <Link to="/sequences">Voir mes séquences</Link></div>
      </main>
    );
  }

  const best = attempts.length ? Math.max(...attempts.map(a => a.score)) : null;

  const settings = (
    <>
      <div className="card">
        <h3>Réglages</h3>
        <div className="row">
          <div className="field grow">
            <label htmlFor="t-time">Temps (s)</label>
            <input
              id="t-time" type="number" min={2} max={900} value={seq.timerSeconds}
              onChange={e => void updateSequence(seq.id, { timerSeconds: Number(e.target.value) })}
            />
          </div>
          <div className="field grow">
            <label htmlFor="t-flash">Pierre visible (ms)</label>
            <input
              id="t-flash" type="number" min={0} max={3000} step={50} value={seq.flashMs}
              onChange={e => void updateSequence(seq.id, { flashMs: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {seq.mode === 'guess'
            ? "Descends le temps vers 3 secondes quand tu réponds trop confortablement."
            : "Baisse le temps d'affichage à mesure que la séquence rentre."}
        </p>
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h3>Historique <span className="tag">{attempts.length}</span></h3>
          <div className="list">
            {attempts.slice(0, 8).map(a => (
              <div key={a.id} className="item" style={{ padding: '.4rem .6rem' }}>
                <div className="main">
                  <div className="title" style={{ fontSize: '.85rem' }}>
                    {a.score}/{a.max} {a.timedOut && <span className="tag">temps écoulé</span>}
                  </div>
                  <div className="meta">
                    <span>{new Date(a.at).toLocaleString('fr-FR')}</span>
                    <span>{(a.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>{seq.name}</h1>
          <p className="sub">
            <span className={MODE_TAG_CLASS[seq.mode]}>{MODE_LABELS[seq.mode]}</span>
            {' '}{seq.moves.length} coup{seq.moves.length > 1 ? 's' : ''} · {seq.timerSeconds}s
            {' '}· révision {dueLabel(seq.srs.due)}
            {seq.origin && (
              <> · <Link to={`/game/${encodeURIComponent(seq.origin.gameId)}`}>{seq.origin.gameLabel}</Link></>
            )}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
          {seq.mode === 'guess' && !editing && (
            <button className="sm" onClick={() => setEditing(true)}>Modifier la réponse</button>
          )}
          <Link className="btn sm" to="/review">Réviser</Link>
          <Link className="btn sm" to="/sequences">Mes séquences</Link>
        </div>
      </div>

      {editing && seq.mode === 'guess' ? (
        <>
          <GuessEditor
            size={seq.size}
            stones={stones}
            color={seq.moves[0]?.color ?? 1}
            answer={seq.moves[0]?.point ?? null}
            accept={seq.accept ?? []}
            playedInGame={seq.playedInGame}
            onChange={(v: GuessAnswer) => {
              if (v.answer === null) return;
              void updateSequence(seq.id, {
                moves: [{ point: v.answer, color: seq.moves[0]?.color ?? 1 }],
                accept: v.accept,
              });
            }}
          />
          <div className="toolbar">
            <button className="primary" onClick={() => setEditing(false)}>Terminer</button>
          </div>
        </>
      ) : (
        <Drill key={seq.id} sequence={seq} onFinish={onFinish} best={best} lastMove={lastMove} aside={settings} />
      )}
    </main>
  );
}
