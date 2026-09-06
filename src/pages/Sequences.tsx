import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import type { Attempt, Sequence } from '../services/model';
import { dueLabel, isDue } from '../services/srs';

type SortKey = 'due' | 'recent' | 'weakest' | 'longest';

interface Row {
  seq: Sequence;
  attempts: Attempt[];
  best: number | null;
  last: number | null;
  /** Meilleur score ramené à la longueur : ce qui permet de repérer les séquences fragiles. */
  mastery: number;
}

const parseTags = (raw: string) =>
  [...new Set(raw.split(',').map(t => t.trim()).filter(Boolean))];

export default function Sequences() {
  const sequences = useStore(s => s.sequences);
  const allAttempts = useStore(s => s.attempts);
  const removeSequence = useStore(s => s.removeSequence);
  const removeSequences = useStore(s => s.removeSequences);
  const updateSequence = useStore(s => s.updateSequence);

  const [sort, setSort] = useState<SortKey>('due');
  const [tagFilter, setTagFilter] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Cette page ne montre que la lecture à l'aveugle ; les coups à corriger vivent
  // dans l'onglet Intuition, qui se travaille tout autrement.
  const blind = useMemo(() => sequences.filter(s => s.mode === 'blind'), [sequences]);

  const tags = useMemo(() => {
    const all = new Set<string>();
    for (const s of blind) for (const t of s.tags) all.add(t);
    return [...all].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [blind]);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, Attempt[]>();
    for (const a of allAttempts) {
      const list = byId.get(a.seqId);
      if (list) list.push(a); else byId.set(a.seqId, [a]);
    }
    const out = blind
      .filter(s => tagFilter === 'all' || s.tags.includes(tagFilter))
      .map(seq => {
        const attempts = (byId.get(seq.id) ?? []).sort((a, b) => b.at - a.at);
        const best = attempts.length ? Math.max(...attempts.map(a => a.score)) : null;
        const last = attempts.length ? attempts[0].score : null;
        const max = Math.max(1, seq.moves.length);
        return { seq, attempts, best, last, mastery: best === null ? -1 : best / max };
      });
    if (sort === 'weakest') return out.sort((a, b) => a.mastery - b.mastery);
    if (sort === 'longest') return out.sort((a, b) => b.seq.moves.length - a.seq.moves.length);
    if (sort === 'recent') return out.sort((a, b) => b.seq.createdAt - a.seq.createdAt);
    return out.sort((a, b) => a.seq.srs.due - b.seq.srs.due);
  }, [blind, allAttempts, sort, tagFilter]);

  const dueNow = useMemo(() => sequences.filter(s => isDue(s.srs)).length, [sequences]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    await removeSequences([...selected]);
    setSelected(new Set());
  };

  const startEdit = (s: Sequence) => {
    setEditing(s.id);
    setDraftName(s.name);
    setDraftTags(s.tags.join(', '));
  };

  const commit = async (id: string) => {
    const name = draftName.trim();
    await updateSequence(id, {
      ...(name ? { name } : {}),
      tags: parseTags(draftTags),
    });
    setEditing(null);
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Séquences</h1>
          <p className="sub">
            Les variations à rejouer de mémoire, à l'aveugle. Les coups à corriger sont
            dans l'onglet Intuition.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          {selected.size > 0 ? (
            <>
              <span className="small muted">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
              <button className="sm danger" onClick={() => void deleteSelected()}>
                Supprimer la sélection
              </button>
              <button className="sm" onClick={() => setSelected(new Set())}>Désélectionner</button>
            </>
          ) : (
            <>
              {rows.length > 0 && (
                <button className="sm" onClick={() => setSelected(new Set(rows.map(r => r.seq.id)))}>
                  Tout sélectionner
                </button>
              )}
              <Link className="btn sm primary" to="/review">
                Réviser{dueNow > 0 ? ` (${dueNow})` : ''}
              </Link>
              <Link className="btn sm" to="/">Importer une partie</Link>
            </>
          )}
        </div>
      </div>

      {blind.length > 0 && (
        <div className="card">
          <div className="row">
            <div className="field" style={{ minWidth: 150 }}>
              <label htmlFor="s-tag">Étiquette</label>
              <select id="s-tag" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                <option value="all">Toutes</option>
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 170 }}>
              <label htmlFor="s-sort">Trier par</label>
              <select id="s-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                <option value="due">Échéance</option>
                <option value="recent">Plus récentes</option>
                <option value="weakest">Les moins maîtrisées</option>
                <option value="longest">Les plus longues</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          {blind.length === 0 ? (
            <>
              Aucune séquence. Ouvre une partie de ta bibliothèque, avance jusqu'à la position
              qui t'intéresse, puis clique sur « Enregistrer une séquence ».
            </>
          ) : (
            <>Aucune séquence avec ces filtres.</>
          )}
        </div>
      ) : (
        <div className="list">
          {rows.map(({ seq, attempts, best, last, mastery }) => {
            const max = seq.moves.length;
            return (
              <div key={seq.id} className="item">
                <input
                  type="checkbox" checked={selected.has(seq.id)} onChange={() => toggle(seq.id)}
                  style={{ width: 16, height: 16, flex: '0 0 auto' }}
                  aria-label={`Sélectionner ${seq.name}`}
                />
                <div className="main">
                  {editing === seq.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                      <input
                        value={draftName} autoFocus placeholder="Nom"
                        onChange={e => setDraftName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') void commit(seq.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <div className="row" style={{ gap: '.4rem' }}>
                        <input
                          className="grow" value={draftTags}
                          placeholder="étiquettes, séparées par des virgules"
                          onChange={e => setDraftTags(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void commit(seq.id);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                        />
                        <button className="sm primary" onClick={() => void commit(seq.id)}>OK</button>
                        <button className="sm" onClick={() => setEditing(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="title">{seq.name}</div>
                  )}
                  <div className="meta">
                    <span>{seq.moves.length} coup{seq.moves.length > 1 ? 's' : ''}</span>
                    <span>{seq.timerSeconds}s</span>
                    <span className={isDue(seq.srs) ? 'tag jade' : ''}>{dueLabel(seq.srs.due)}</span>
                    {seq.tags.map(t => (
                      <button
                        key={t} className="tag" style={{ border: 0, cursor: 'pointer' }}
                        onClick={() => setTagFilter(t)}
                      >
                        {t}
                      </button>
                    ))}
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
                            record {best}/{max}
                          </span>
                          <span>dernier {last}/{max}</span>
                          <span>{attempts.length} essai{attempts.length > 1 ? 's' : ''}</span>
                        </>
                      )}
                  </div>
                </div>
                <div className="actions">
                  <Link className="btn sm primary" to={`/train/${seq.id}`}>S'entraîner</Link>
                  <button className="sm" onClick={() => startEdit(seq)}>Modifier</button>
                  <button className="sm danger" onClick={() => void removeSequence(seq.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
