import { get, set } from 'idb-keyval';
import type { StoredGame, Sequence, Attempt } from './model';
import { newSrs } from './srs';

const K = { games: 'gofantome:games', sequences: 'gofantome:sequences', attempts: 'gofantome:attempts' };

export const EXPORT_VERSION = 2;

/**
 * Les séquences enregistrées avant l'arrivée des modes et de la répétition espacée
 * n'ont ni `mode`, ni `tags`, ni `srs`. On les complète à la lecture plutôt que par une
 * migration en place : c'est idempotent, et ça couvre aussi les fichiers de sauvegarde
 * exportés à l'époque.
 */
export function normalizeSequence(s: Sequence): Sequence {
  if (s.mode && s.tags && s.srs) return s;
  return {
    ...s,
    mode: s.mode ?? 'blind',
    tags: s.tags ?? [],
    // Échéance immédiate : une séquence d'avant la migration est à revoir maintenant.
    srs: s.srs ?? newSrs(s.createdAt ?? Date.now()),
  };
}

function normalizeAttempt(a: Attempt): Attempt {
  return a.mode ? a : { ...a, mode: 'blind' };
}

async function load<T>(key: string): Promise<T[]> {
  try {
    return (await get<T[]>(key)) ?? [];
  } catch {
    return [];
  }
}

export const loadGames = () => load<StoredGame>(K.games);
export const saveGames = (v: StoredGame[]) => set(K.games, v);

export const loadSequences = async () => (await load<Sequence>(K.sequences)).map(normalizeSequence);
export const saveSequences = (v: Sequence[]) => set(K.sequences, v);

/**
 * Comme `loadSequences`, mais signale si la normalisation a réellement modifié quelque
 * chose. L'appelant peut alors réécrire le stockage, pour que ce qui est sur disque
 * corresponde à ce que l'application manipule.
 */
export async function loadSequencesMigrating(): Promise<{ sequences: Sequence[]; migrated: boolean }> {
  const raw = await load<Sequence>(K.sequences);
  const sequences = raw.map(normalizeSequence);
  // normalizeSequence renvoie l'objet d'origine quand il n'y a rien à compléter.
  return { sequences, migrated: sequences.some((s, i) => s !== raw[i]) };
}

export const loadAttempts = async () => (await load<Attempt>(K.attempts)).map(normalizeAttempt);
export const saveAttempts = (v: Attempt[]) => set(K.attempts, v);

/** Export complet, pour que l'utilisateur puisse sauvegarder son travail hors du navigateur. */
export async function exportAll() {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    games: await loadGames(),
    sequences: await loadSequences(),
    attempts: await loadAttempts(),
  };
}

export async function importAll(data: unknown, mode: 'merge' | 'replace' = 'merge') {
  const d = data as Awaited<ReturnType<typeof exportAll>>;
  if (!d || !Array.isArray(d.sequences)) throw new Error('Fichier de sauvegarde non reconnu.');

  // Une sauvegarde en version 1 est acceptée telle quelle : la normalisation la complète.
  const sequences = (d.sequences ?? []).map(normalizeSequence);
  const attempts = (d.attempts ?? []).map(normalizeAttempt);

  if (mode === 'replace') {
    await saveGames(d.games ?? []);
    await saveSequences(sequences);
    await saveAttempts(attempts);
    return;
  }

  const mergeById = <T extends { id: string }>(a: T[], b: T[]) => {
    const seen = new Map(a.map(x => [x.id, x]));
    for (const x of b) if (!seen.has(x.id)) seen.set(x.id, x);
    return [...seen.values()];
  };
  await saveGames(mergeById(await loadGames(), d.games ?? []));
  await saveSequences(mergeById(await loadSequences(), sequences));
  await saveAttempts(mergeById(await loadAttempts(), attempts));
}
