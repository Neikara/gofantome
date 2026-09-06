import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DrillSession from '../components/DrillSession';
import { useStore } from '../state/store';
import type { Attempt } from '../services/model';
import { dueLabel } from '../services/srs';

type Focus = 'all' | 'untried' | 'missed';
type Order = 'random' | 'order';

interface Row {
  id: string;
  name: string;
  tags: string[];
  due: number;
  tries: number;
  hits: number;
  /** -1 quand jamais tentée, pour la faire remonter au tri. */
  rate: number;
  toFix: boolean;
}

const SIZES = [10, 20, 50];

export default function Intuition() {
  const sequences = useStore(s => s.sequences);
  const allAttempts = useStore(s => s.attempts);
  const removeSequences = useStore(s => s.removeSequences);

  const [focus, setFocus] = useState<Focus>('all');
  const [order, setOrder] = useState<Order>('random');
  const [size, setSize] = useState(10);
  const [tag, setTag] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<Attempt[] | null>(null);

  const guesses = useMemo(() => sequences.filter(s => s.mode === 'guess'), [sequences]);

  const tags = useMemo(() => {
    const all = new Set<string>();
    for (const s of guesses) for (const t of s.tags) all.add(t);
    return [...all].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [guesses]);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, Attempt[]>();
    for (const a of allAttempts) {
      const list = byId.get(a.seqId);
      if (list) list.push(a); else byId.set(a.seqId, [a]);
    }
    return guesses.map(s => {
      const tries = byId.get(s.id) ?? [];
      const hits = tries.filter(a => a.score === a.max).length;
      return {
        id: s.id,
        name: s.name,
        tags: s.tags,
        due: s.srs.due,
        tries: tries.length,
        hits,
        rate: tries.length ? hits / tries.length : -1,
        toFix: s.playedInGame !== null && s.playedInGame !== undefined,
      };
    });
  }, [guesses, allAttempts]);

  const filtered = useMemo(() => {
    let out = rows.filter(r => tag === 'all' || r.tags.includes(tag));
    if (focus === 'untried') out = out.filter(r => r.tries === 0);
    if (focus === 'missed') out = out.filter(r => r.tries > 0 && r.rate < 1);
    // Les moins sûres d'abord : jamais tentées, puis les plus ratées.
    return [...out].sort((a, b) => a.rate - b.rate);
  }, [rows, tag, focus]);

  const stats = useMemo(() => {
    const tried = rows.filter(r => r.tries > 0);
    const totalTries = rows.reduce((n, r) => n + r.tries, 0);
    const totalHits = rows.reduce((n, r) => n + r.hits, 0);
    return {
      total: rows.length,
      untried: rows.length - tried.length,
      rate: totalTries ? Math.round((totalHits / totalTries) * 100) : null,
      totalTries,
    };
  }, [rows]);

  const start = () => {
    if (!filtered.length) return;
    const ids = filtered.map(r => r.id);
    if (order === 'random') {
      // Mélange de Fisher-Yates : l'intuition se travaille hors contexte, dans le désordre.
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    setSummary(null);
    setSession(ids.slice(0, size));
  };

  const onFinished = useCallback((done: Attempt[]) => {
    setSummary(done);
    setSession(null);
  }, []);

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

  if (session) {
    return (
      <main className="page">
        <DrillSession ids={session} label="Série" onQuit={() => setSession(null)} onFinished={onFinished} />
      </main>
    );
  }

  if (summary) {
    const hits = summary.filter(a => a.score === a.max).length;
    const pct = summary.length ? Math.round((hits / summary.length) * 100) : 0;
    const avg = summary.length
      ? (summary.reduce((n, a) => n + a.durationMs, 0) / summary.length / 1000).toFixed(1)
      : '0';
    return (
      <main className="page">
        <div className="page-head"><h1>Série terminée</h1></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className={`banner ${pct >= 70 ? 'ok' : pct >= 40 ? 'info' : 'bad'}`}>
            {hits} sur {summary.length} — {pct}%.
            {pct >= 90 && ' Descends le chrono, tu as le temps de calculer.'}
          </div>
          <div className="stat-row" style={{ marginTop: '.9rem' }}>
            <div className="stat"><div className="k">Trouvés</div><div className={`v ${pct >= 70 ? 'good' : ''}`}>{hits}</div></div>
            <div className="stat"><div className="k">Sur</div><div className="v">{summary.length}</div></div>
            <div className="stat"><div className="k">Temps moyen</div><div className="v">{avg}s</div></div>
          </div>
          <div className="toolbar" style={{ justifyContent: 'flex-start', marginTop: '1rem' }}>
            <button className="primary" onClick={start}>Nouvelle série</button>
            <button onClick={() => setSummary(null)}>Retour</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Intuition</h1>
          <p className="sub">
            Tous les exercices d'un coup, enchaînés en série. Ici on cherche le volume et la
            vitesse : si tu as le temps de calculer, baisse le chrono.
          </p>
        </div>
        <Link className="btn sm" to="/" style={{ marginLeft: 'auto' }}>Créer depuis une partie</Link>
      </div>

      {stats.total === 0 ? (
        <div className="empty">
          Aucun exercice d'un coup. Ouvre une partie, place-toi sur une position, puis
          « Deviner le coup » — ou « Corriger le coup » sur tes propres erreurs.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="stat-row" style={{ marginBottom: '.9rem' }}>
              <div className="stat"><div className="k">Exercices</div><div className="v">{stats.total}</div></div>
              <div className="stat">
                <div className="k">Réussite</div>
                <div className={`v ${stats.rate !== null && stats.rate >= 70 ? 'good' : stats.rate !== null && stats.rate < 40 ? 'bad' : ''}`}>
                  {stats.rate === null ? '—' : `${stats.rate}%`}
                </div>
              </div>
              <div className="stat"><div className="k">Jamais tentés</div><div className="v">{stats.untried}</div></div>
              <div className="stat"><div className="k">Essais</div><div className="v">{stats.totalTries}</div></div>
            </div>

            <div className="row">
              <div className="field" style={{ minWidth: 165 }}>
                <label htmlFor="i-focus">Sélection</label>
                <select id="i-focus" value={focus} onChange={e => setFocus(e.target.value as Focus)}>
                  <option value="all">Tous</option>
                  <option value="untried">Jamais tentés</option>
                  <option value="missed">Déjà ratés</option>
                </select>
              </div>
              <div className="field" style={{ minWidth: 140 }}>
                <label htmlFor="i-tag">Étiquette</label>
                <select id="i-tag" value={tag} onChange={e => setTag(e.target.value)}>
                  <option value="all">Toutes</option>
                  {tags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field" style={{ minWidth: 120 }}>
                <label htmlFor="i-size">Longueur</label>
                <select id="i-size" value={size} onChange={e => setSize(Number(e.target.value))}>
                  {SIZES.map(n => <option key={n} value={n}>{n} exercices</option>)}
                  <option value={9999}>Tout</option>
                </select>
              </div>
              <div className="field" style={{ minWidth: 130 }}>
                <label htmlFor="i-order">Ordre</label>
                <select id="i-order" value={order} onChange={e => setOrder(e.target.value as Order)}>
                  <option value="random">Aléatoire</option>
                  <option value="order">Les moins sûrs</option>
                </select>
              </div>
              <button className="primary" onClick={start} disabled={!filtered.length}>
                Lancer la série ({Math.min(size, filtered.length)})
              </button>
            </div>
          </div>

          <div className="page-head" style={{ marginTop: '1.5rem', marginBottom: '.6rem' }}>
            <h2 style={{ margin: 0 }}>
              Les exercices <span className="tag">{filtered.length}</span>
            </h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              {selected.size > 0 && (
                <>
                  <span className="small muted">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                  <button className="sm danger" onClick={() => void deleteSelected()}>
                    Supprimer la sélection
                  </button>
                  <button className="sm" onClick={() => setSelected(new Set())}>Désélectionner</button>
                </>
              )}
              {selected.size === 0 && filtered.length > 0 && (
                <button className="sm" onClick={() => setSelected(new Set(filtered.map(r => r.id)))}>
                  Tout sélectionner
                </button>
              )}
            </div>
          </div>

          <div className="list">
            {filtered.map(r => (
              <div key={r.id} className="item">
                <input
                  type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)}
                  style={{ width: 16, height: 16, flex: '0 0 auto' }}
                  aria-label={`Sélectionner ${r.name}`}
                />
                <div className="main">
                  <div className="title">{r.name}</div>
                  <div className="meta">
                    {r.toFix && <span className="tag accent">à corriger</span>}
                    {r.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    <span>{r.tries === 0 ? 'jamais tenté' : `${r.hits}/${r.tries} réussis`}</span>
                    <span>{dueLabel(r.due)}</span>
                  </div>
                </div>
                <div className="actions">
                  <Link className="btn sm primary" to={`/train/${r.id}`}>Ouvrir</Link>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="small muted">Aucun exercice avec ces filtres.</p>}
          </div>
        </>
      )}
    </main>
  );
}
