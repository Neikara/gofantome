import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DrillSession from '../components/DrillSession';
import { useStore } from '../state/store';
import { MODE_LABELS, type Attempt, type DrillMode, type Sequence } from '../services/model';
import { dueLabel, isDue } from '../services/srs';

type ModeFilter = 'all' | DrillMode;

export default function Review() {
  const sequences = useStore(s => s.sequences);

  const [mode, setMode] = useState<ModeFilter>('all');
  const [tag, setTag] = useState('all');
  const [session, setSession] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<Attempt[] | null>(null);

  const tags = useMemo(() => {
    const all = new Set<string>();
    for (const s of sequences) for (const t of s.tags) all.add(t);
    return [...all].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [sequences]);

  const matches = useCallback(
    (s: Sequence) => (mode === 'all' || s.mode === mode) && (tag === 'all' || s.tags.includes(tag)),
    [mode, tag],
  );

  /** Ce qui est dû maintenant, le plus en retard d'abord. */
  const due = useMemo(
    () => sequences.filter(s => matches(s) && isDue(s.srs)).sort((a, b) => a.srs.due - b.srs.due),
    [sequences, matches],
  );

  const upcoming = useMemo(
    () => sequences.filter(s => matches(s) && !isDue(s.srs)).sort((a, b) => a.srs.due - b.srs.due),
    [sequences, matches],
  );

  const start = () => {
    if (!due.length) return;
    setSummary(null);
    setSession(due.map(s => s.id));
  };

  const onFinished = useCallback((done: Attempt[]) => {
    setSummary(done);
    setSession(null);
  }, []);

  if (session) {
    return (
      <main className="page">
        <DrillSession ids={session} label="Révision" onQuit={() => setSession(null)} onFinished={onFinished} />
      </main>
    );
  }

  if (summary) {
    const revised = summary.length;
    const perfect = summary.filter(a => a.score === a.max).length;
    const points = summary.reduce((n, a) => n + a.score, 0);
    const maxPoints = summary.reduce((n, a) => n + a.max, 0);
    return (
      <main className="page">
        <div className="page-head"><h1>Session terminée</h1></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className={`banner ${perfect === revised && revised > 0 ? 'ok' : 'info'}`}>
            {revised === 0
              ? 'Rien à réviser.'
              : perfect === revised
                ? `${revised} exercice${revised > 1 ? 's' : ''}, tout juste.`
                : `${perfect} sans faute sur ${revised}.`}
          </div>
          <div className="stat-row" style={{ marginTop: '.9rem' }}>
            <div className="stat"><div className="k">Revus</div><div className="v">{revised}</div></div>
            <div className="stat">
              <div className="k">Points</div>
              <div className={`v ${points === maxPoints ? 'good' : ''}`}>
                {points}<span className="muted" style={{ fontSize: '.8rem' }}>/{maxPoints}</span>
              </div>
            </div>
            <div className="stat"><div className="k">Reste dû</div><div className="v">{due.length}</div></div>
          </div>
          <div className="toolbar" style={{ justifyContent: 'flex-start', marginTop: '1rem' }}>
            <button className="primary" onClick={() => setSummary(null)}>Retour</button>
            {due.length > 0 && <button onClick={start}>Enchaîner ({due.length})</button>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Réviser</h1>
          <p className="sub">
            Les exercices reviennent quand ils sont dus. Ne filtre pas si tu veux tout mélangé —
            c'est le plus proche d'une vraie partie.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div className="field" style={{ minWidth: 190 }}>
            <label htmlFor="r-mode">Type d'exercice</label>
            <select id="r-mode" value={mode} onChange={e => setMode(e.target.value as ModeFilter)}>
              <option value="all">Tout mélangé</option>
              <option value="blind">{MODE_LABELS.blind}</option>
              <option value="guess">{MODE_LABELS.guess}</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 190 }}>
            <label htmlFor="r-tag">Étiquette</label>
            <select id="r-tag" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="all">Toutes</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="primary" onClick={start} disabled={!due.length}>
            Commencer ({due.length})
          </button>
        </div>
      </div>

      {due.length === 0 ? (
        <div className="empty">
          {sequences.length === 0
            ? <>Aucun exercice. <Link to="/">Importe une partie</Link> pour en créer.</>
            : upcoming.length > 0
              ? <>Rien à réviser pour l'instant. Prochain exercice {dueLabel(upcoming[0].srs.due)}.</>
              : <>Rien à réviser avec ces filtres.</>}
        </div>
      ) : (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>À réviser <span className="tag">{due.length}</span></h2>
          <div className="list">
            {due.slice(0, 12).map(s => (
              <div key={s.id} className="item">
                <div className="main">
                  <div className="title">{s.name}</div>
                  <div className="meta">
                    <span className="tag accent">{MODE_LABELS[s.mode]}</span>
                    <span>{s.moves.length} coup{s.moves.length > 1 ? 's' : ''}</span>
                    {s.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    <span>{s.srs.reps === 0 ? 'jamais révisé' : `${s.srs.reps} révision${s.srs.reps > 1 ? 's' : ''}`}</span>
                  </div>
                </div>
                <div className="actions">
                  <Link className="btn sm" to={`/train/${s.id}`}>Ouvrir seul</Link>
                </div>
              </div>
            ))}
            {due.length > 12 && <p className="small muted">…et {due.length - 12} de plus.</p>}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>À venir</h2>
          <div className="list">
            {upcoming.slice(0, 6).map(s => (
              <div key={s.id} className="item">
                <div className="main">
                  <div className="title">{s.name}</div>
                  <div className="meta">
                    <span className="tag accent">{MODE_LABELS[s.mode]}</span>
                    <span>{dueLabel(s.srs.due)}</span>
                    {s.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <div className="actions">
                  <Link className="btn sm" to={`/train/${s.id}`}>Réviser quand même</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
