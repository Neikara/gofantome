import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import type { Attempt, Sequence } from '../services/model';

type SortKey = 'recent' | 'weakest' | 'longest';

interface Row {
  seq: Sequence;
  attempts: Attempt[];
  best: number | null;
  last: number | null;
  /** Meilleur score ramené à la longueur : ce qui permet de repérer les séquences fragiles. */
  mastery: number;
}

export default function Sequences() {
  const sequences = useStore(s => s.sequences);
  const allAttempts = useStore(s => s.attempts);
  const removeSequence = useStore(s => s.removeSequence);
  const updateSequence = useStore(s => s.updateSequence);

  const [sort, setSort] = useState<SortKey>('recent');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, Attempt[]>();
    for (const a of allAttempts) {
      const list = byId.get(a.seqId);
      if (list) list.push(a); else byId.set(a.seqId, [a]);
    }
    const out = sequences.map(seq => {
      const attempts = (byId.get(seq.id) ?? []).sort((a, b) => b.at - a.at);
      const best = attempts.length ? Math.max(...attempts.map(a => a.score)) : null;
      const last = attempts.length ? attempts[0].score : null;
      return {
        seq, attempts, best, last,
        mastery: best === null ? -1 : best / Math.max(1, seq.moves.length),
      };
    });
    if (sort === 'weakest') return out.sort((a, b) => a.mastery - b.mastery);
    if (sort === 'longest') return out.sort((a, b) => b.seq.moves.length - a.seq.moves.length);
    return out.sort((a, b) => b.seq.createdAt - a.seq.createdAt);
  }, [sequences, allAttempts, sort]);

  const rename = async (id: string) => {
    const name = draftName.trim();
    if (name) await updateSequence(id, { name });
    setEditing(null);
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Séquences</h1>
          <p className="sub">Chaque séquence est un exercice de lecture : rejoue-la de mémoire, à l'aveugle.</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ width: 'auto' }}>
            <option value="recent">Plus récentes</option>
            <option value="weakest">Les moins maîtrisées</option>
            <option value="longest">Les plus longues</option>
          </select>
          <Link className="btn sm primary" to="/">Importer une partie</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          Aucune séquence. Ouvre une partie de ta bibliothèque, avance jusqu'à la position
          qui t'intéresse, puis clique sur « Enregistrer une séquence ».
        </div>
      ) : (
        <div className="list">
          {rows.map(({ seq, attempts, best, last, mastery }) => (
            <div key={seq.id} className="item">
              <div className="main">
                {editing === seq.id ? (
                  <div className="row" style={{ gap: '.4rem' }}>
                    <input
                      className="grow" value={draftName} autoFocus
                      onChange={e => setDraftName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void rename(seq.id);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                    />
                    <button className="sm primary" onClick={() => void rename(seq.id)}>OK</button>
                    <button className="sm" onClick={() => setEditing(null)}>Annuler</button>
                  </div>
                ) : (
                  <div className="title">{seq.name}</div>
                )}
                <div className="meta">
                  <span>{seq.moves.length} coups</span>
                  <span>{seq.size}×{seq.size}</span>
                  <span>{seq.timerSeconds}s</span>
                  {seq.origin && (
                    <Link to={`/game/${encodeURIComponent(seq.origin.gameId)}`} className="muted">
                      {seq.origin.gameLabel} · coup {seq.origin.moveNumber + 1}
                    </Link>
                  )}
                  {attempts.length === 0
                    ? <span className="tag">jamais tentée</span>
                    : (
                      <>
                        <span className={`tag ${mastery === 1 ? 'jade' : mastery < 0.7 ? '' : 'accent'}`}>
                          record {best}/{seq.moves.length}
                        </span>
                        <span>dernier {last}/{seq.moves.length}</span>
                        <span>{attempts.length} essai{attempts.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                </div>
              </div>
              <div className="actions">
                <Link className="btn sm primary" to={`/train/${seq.id}`}>S'entraîner</Link>
                <button className="sm" onClick={() => { setEditing(seq.id); setDraftName(seq.name); }}>Renommer</button>
                <button className="sm danger" onClick={() => void removeSequence(seq.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
