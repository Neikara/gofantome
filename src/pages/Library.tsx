import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import * as ogs from '../services/ogs';
import type { StoredGame } from '../services/model';
import { buildReplay } from '../core/replay';
import { exportAll, importAll } from '../services/storage';

const LAST_USER_KEY = 'gofantome:lastUsername';

function metaFromSgf(sgf: string) {
  const r = buildReplay(sgf);
  return {
    name: r.info.name,
    size: r.info.size,
    komi: r.info.komi,
    handicap: r.info.handicap,
    result: r.info.result,
    date: r.info.date,
    black: r.info.players.black.name,
    blackRank: r.info.players.black.rank,
    white: r.info.players.white.name,
    whiteRank: r.info.players.white.rank,
    moveCount: r.moves.length,
  };
}

export default function Library() {
  const games = useStore(s => s.games);
  const addGame = useStore(s => s.addGame);
  const removeGame = useStore(s => s.removeGame);
  const sequences = useStore(s => s.sequences);
  const reload = useStore(s => s.reload);

  const [username, setUsername] = useState(() => localStorage.getItem(LAST_USER_KEY) ?? '');
  const [player, setPlayer] = useState<ogs.OgsPlayer | null>(null);
  const [candidates, setCandidates] = useState<ogs.OgsPlayer[]>([]);
  const [ogsGames, setOgsGames] = useState<ogs.OgsGameSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [directRef, setDirectRef] = useState('');
  const [sgfText, setSgfText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imported = new Set(games.map(g => g.id));

  const loadPlayerGames = useCallback(async (p: ogs.OgsPlayer, wanted = 1) => {
    setBusy(true); setError(null); setCandidates([]);
    try {
      const res = await ogs.listGames(p.id, wanted, 25);
      setPlayer(p);
      setPage(wanted);
      setHasMore(Boolean(res.next));
      setOgsGames(res.results.filter(g => !g.annulled));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const search = useCallback(async () => {
    const q = username.trim();
    if (!q) return;
    setBusy(true); setError(null); setNotice(null);
    setPlayer(null); setCandidates([]); setOgsGames([]); setPage(1);
    try {
      let found = await ogs.searchPlayers(q);
      if (!found.length) found = await ogs.searchPlayersLoose(q);
      if (!found.length) { setError(`Aucun joueur nommé « ${q} » sur OGS.`); return; }
      localStorage.setItem(LAST_USER_KEY, q);
      if (found.length === 1) await loadPlayerGames(found[0]);
      else setCandidates(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [username, loadPlayerGames]);

  const importGame = async (gameId: number) => {
    setImporting(gameId); setError(null); setNotice(null);
    try {
      const sgf = await ogs.fetchSgf(gameId);
      const meta = metaFromSgf(sgf);
      const g: StoredGame = {
        id: `ogs:${gameId}`, source: 'ogs', sourceId: String(gameId),
        sgf, addedAt: Date.now(), meta,
      };
      await addGame(g);
      setNotice(`Importé : ${meta.black} vs ${meta.white} — ${meta.moveCount} coups.`);
    } catch (e) {
      setError(`Import de la partie ${gameId} impossible. ${e instanceof Error ? e.message : ''}`);
    } finally {
      setImporting(null);
    }
  };

  const importDirect = async () => {
    const id = ogs.parseGameRef(directRef);
    if (!id) { setError('Donne un numéro de partie OGS, ou une URL online-go.com/game/…'); return; }
    await importGame(id);
    setDirectRef('');
  };

  const importSgfText = async (text: string, name?: string) => {
    setError(null); setNotice(null);
    try {
      const meta = metaFromSgf(text);
      await addGame({
        id: `sgf:${Date.now().toString(36)}`,
        source: 'sgf',
        sourceId: name ?? 'collé',
        sgf: text, addedAt: Date.now(), meta,
      });
      setNotice(`SGF ajouté : ${meta.black} vs ${meta.white} — ${meta.moveCount} coups.`);
      setSgfText(''); setShowPaste(false);
    } catch (e) {
      setError(`SGF illisible. ${e instanceof Error ? e.message : ''}`);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const text = await f.text();
      if (f.name.endsWith('.json')) {
        try {
          await importAll(JSON.parse(text));
          await reload();
          setNotice('Sauvegarde restaurée.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } else {
        await importSgfText(text, f.name);
      }
    }
  };

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gofantome-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const seqCount = (gameId: string) => sequences.filter(s => s.origin?.gameId === gameId).length;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Parties</h1>
          <p className="sub">Importe tes parties OGS, puis ouvre-en une pour enregistrer une séquence à lire.</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
          <button className="sm" onClick={() => void doExport()}>Exporter</button>
          <button className="sm" onClick={() => fileRef.current?.click()}>Ouvrir un fichier</button>
          <input
            ref={fileRef} type="file" accept=".sgf,.json" multiple hidden
            onChange={e => { void onFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div className="grow" style={{ minWidth: 200 }}>
            <label htmlFor="ogs-user">Pseudo OGS</label>
            <input
              id="ogs-user" value={username} placeholder="ton pseudo online-go.com"
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void search(); }}
            />
          </div>
          <button className="primary" onClick={() => void search()} disabled={busy || !username.trim()}>
            {busy && <span className="spinner" />} Chercher ses parties
          </button>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 .3rem' }} />
          <div style={{ minWidth: 190 }}>
            <label htmlFor="direct">Partie précise</label>
            <input
              id="direct" value={directRef} placeholder="n° ou URL de la partie"
              onChange={e => setDirectRef(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void importDirect(); }}
            />
          </div>
          <button onClick={() => void importDirect()} disabled={!directRef.trim() || importing !== null}>
            Importer
          </button>
          <button className="ghost" onClick={() => setShowPaste(v => !v)}>Coller un SGF</button>
        </div>

        {showPaste && (
          <div style={{ marginTop: '.8rem' }}>
            <textarea
              rows={5} value={sgfText} placeholder="(;FF[4]GM[1]SZ[19]…"
              onChange={e => setSgfText(e.target.value)}
            />
            <div style={{ marginTop: '.5rem' }}>
              <button className="primary sm" disabled={!sgfText.trim()} onClick={() => void importSgfText(sgfText)}>
                Ajouter ce SGF
              </button>
            </div>
          </div>
        )}

        {error && <p className="error" style={{ marginTop: '.7rem', marginBottom: 0 }}>{error}</p>}
        {notice && <div className="banner ok" style={{ marginTop: '.7rem' }}>{notice}</div>}
      </div>

      {candidates.length > 0 && (
        <div className="card">
          <h3>Plusieurs joueurs correspondent</h3>
          <div className="list">
            {candidates.map(p => (
              <button key={p.id} className="item" style={{ textAlign: 'left' }} onClick={() => void loadPlayerGames(p)}>
                <div className="main">
                  <div className="title">{p.username}</div>
                  <div className="meta">
                    <span>{ogs.rankLabel(p.ranking)}</span>
                    <span className="mono">#{p.id}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {player && (
        <div className="card">
          <div className="page-head" style={{ marginBottom: '.8rem' }}>
            <h2 style={{ margin: 0 }}>
              Parties de {player.username} <span className="tag">{ogs.rankLabel(player.ranking)}</span>
            </h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
              <button className="sm" disabled={page <= 1 || busy} onClick={() => void loadPlayerGames(player, page - 1)}>
                Précédent
              </button>
              <span className="small muted" style={{ alignSelf: 'center' }}>page {page}</span>
              <button className="sm" disabled={!hasMore || busy} onClick={() => void loadPlayerGames(player, page + 1)}>
                Suivant
              </button>
            </div>
          </div>
          {busy && <p className="muted"><span className="spinner" /> Chargement…</p>}
          <div className="list">
            {ogsGames.map(g => {
              const done = imported.has(`ogs:${g.id}`);
              const finished = Boolean(g.ended);
              return (
                <div key={g.id} className="item">
                  <div className="main">
                    <div className="title">
                      {g.players.black.username} <span className="muted">vs</span> {g.players.white.username}
                    </div>
                    <div className="meta">
                      <span>{g.width}×{g.height}</span>
                      {g.handicap > 0 && <span>H{g.handicap}</span>}
                      <span>{g.ranked ? 'classée' : 'libre'}</span>
                      <span>{g.ended ? new Date(g.ended).toLocaleDateString('fr-FR') : 'en cours'}</span>
                    </div>
                  </div>
                  <div className="actions">
                    {done ? (
                      <Link className="btn sm" to={`/game/${encodeURIComponent(`ogs:${g.id}`)}`}>Ouvrir</Link>
                    ) : (
                      <button
                        className="sm primary" disabled={!finished || importing === g.id}
                        title={finished ? '' : 'OGS ne donne le SGF que pour les parties terminées'}
                        onClick={() => void importGame(g.id)}
                      >
                        {importing === g.id && <span className="spinner" />} Importer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!busy && !ogsGames.length && <p className="muted small">Aucune partie sur cette page.</p>}
          </div>
        </div>
      )}

      <h2 style={{ marginTop: '1.75rem' }}>Ma bibliothèque <span className="tag">{games.length}</span></h2>
      {games.length === 0 ? (
        <div className="empty">Rien encore. Cherche ton pseudo OGS ci-dessus, ou colle un SGF.</div>
      ) : (
        <div className="list">
          {games.map(g => (
            <div key={g.id} className="item">
              <div className="main">
                <Link to={`/game/${encodeURIComponent(g.id)}`} style={{ textDecoration: 'none' }}>
                  <div className="title">
                    {g.meta.black} <span className="muted small">{g.meta.blackRank}</span>
                    <span className="muted"> vs </span>
                    {g.meta.white} <span className="muted small">{g.meta.whiteRank}</span>
                  </div>
                </Link>
                <div className="meta">
                  <span>{g.meta.size}×{g.meta.size}</span>
                  <span>{g.meta.moveCount} coups</span>
                  {g.meta.result && <span>{g.meta.result}</span>}
                  {g.meta.date && <span>{g.meta.date}</span>}
                  {seqCount(g.id) > 0 && (
                    <span className="tag jade">
                      {seqCount(g.id)} séquence{seqCount(g.id) > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="tag">{g.source === 'ogs' ? `OGS #${g.sourceId}` : 'SGF'}</span>
                </div>
              </div>
              <div className="actions">
                <Link className="btn sm primary" to={`/game/${encodeURIComponent(g.id)}`}>Ouvrir</Link>
                <button className="sm danger" onClick={() => void removeGame(g.id)}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
