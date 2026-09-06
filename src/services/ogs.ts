/**
 * Client de l'API publique OGS. Tout est en CORS ouvert (access-control-allow-origin: *),
 * donc aucun proxy n'est nécessaire.
 */
const API = 'https://online-go.com/api/v1';

export interface OgsPlayer {
  id: number;
  username: string;
  ranking: number;
  icon: string;
  country: string;
}

export interface OgsGameSummary {
  id: number;
  name: string;
  width: number;
  height: number;
  komi: string;
  handicap: number;
  ranked: boolean;
  rules: string;
  outcome: string;
  black_lost: boolean;
  white_lost: boolean;
  started: string | null;
  ended: string | null;
  annulled: boolean;
  players: {
    black: { id: number; username: string; ranking: number };
    white: { id: number; username: string; ranking: number };
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`OGS a répondu ${res.status} sur ${url}`);
  return res.json() as Promise<T>;
}

/** Convertit le "ranking" OGS en rang lisible (30k -> 9d). */
export function rankLabel(ranking: number | undefined | null): string {
  if (ranking === undefined || ranking === null) return '?';
  const r = Math.floor(ranking);
  return r < 30 ? `${30 - r}k` : `${r - 29}d`;
}

export function searchPlayers(username: string, signal?: AbortSignal) {
  return getJson<{ results: OgsPlayer[] }>(
    `${API}/players/?username=${encodeURIComponent(username)}`, signal,
  ).then(r => r.results);
}

/** Recherche approchante : l'API accepte aussi un préfixe via `username__istartswith`. */
export function searchPlayersLoose(q: string, signal?: AbortSignal) {
  return getJson<{ results: OgsPlayer[] }>(
    `${API}/players/?username__istartswith=${encodeURIComponent(q)}&page_size=10`, signal,
  ).then(r => r.results);
}

export function listGames(playerId: number, page = 1, pageSize = 25, signal?: AbortSignal) {
  return getJson<{ count: number; next: string | null; results: OgsGameSummary[] }>(
    `${API}/players/${playerId}/games/?page=${page}&page_size=${pageSize}&ordering=-ended`, signal,
  );
}

export function gameSummary(gameId: number, signal?: AbortSignal) {
  return getJson<OgsGameSummary>(`${API}/games/${gameId}`, signal);
}

/** Les parties en cours renvoient 200 avec un message texte au lieu du SGF. */
export async function fetchSgf(gameId: number, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${API}/games/${gameId}/sgf`, { signal });
  if (!res.ok) throw new Error(`SGF indisponible (HTTP ${res.status}).`);
  const text = await res.text();
  if (!text.trimStart().startsWith('(')) {
    throw new Error(text.trim().slice(0, 200) || 'SGF vide.');
  }
  return text;
}

/** Extrait un identifiant de partie depuis une URL OGS ou un nombre brut. */
export function parseGameRef(input: string): number | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = /online-go\.com\/(?:game|review)\/(?:view\/)?(\d+)/.exec(s);
  return m ? parseInt(m[1], 10) : null;
}
