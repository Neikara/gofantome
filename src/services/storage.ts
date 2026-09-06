import { get, set } from 'idb-keyval';
import type { StoredGame, Sequence, Attempt } from './model';

const K = { games: 'gofantome:games', sequences: 'gofantome:sequences', attempts: 'gofantome:attempts' };

async function load<T>(key: string): Promise<T[]> {
  try {
    return (await get<T[]>(key)) ?? [];
  } catch {
    return [];
  }
}

export const loadGames = () => load<StoredGame>(K.games);
export const saveGames = (v: StoredGame[]) => set(K.games, v);

export const loadSequences = () => load<Sequence>(K.sequences);
export const saveSequences = (v: Sequence[]) => set(K.sequences, v);

export const loadAttempts = () => load<Attempt>(K.attempts);
export const saveAttempts = (v: Attempt[]) => set(K.attempts, v);

/** Export complet, pour que l'utilisateur puisse sauvegarder son travail hors du navigateur. */
export async function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    games: await loadGames(),
    sequences: await loadSequences(),
    attempts: await loadAttempts(),
  };
}

export async function importAll(data: unknown, mode: 'merge' | 'replace' = 'merge') {
  const d = data as Awaited<ReturnType<typeof exportAll>>;
  if (!d || !Array.isArray(d.sequences)) throw new Error('Fichier de sauvegarde non reconnu.');
  if (mode === 'replace') {
    await saveGames(d.games ?? []);
    await saveSequences(d.sequences ?? []);
    await saveAttempts(d.attempts ?? []);
    return;
  }
  const mergeById = <T extends { id: string }>(a: T[], b: T[]) => {
    const seen = new Map(a.map(x => [x.id, x]));
    for (const x of b) if (!seen.has(x.id)) seen.set(x.id, x);
    return [...seen.values()];
  };
  await saveGames(mergeById(await loadGames(), d.games ?? []));
  await saveSequences(mergeById(await loadSequences(), d.sequences ?? []));
  await saveAttempts(mergeById(await loadAttempts(), d.attempts ?? []));
}
