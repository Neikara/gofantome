import { create } from 'zustand';
import type { StoredGame, Sequence, Attempt } from '../services/model';
import * as db from '../services/storage';
import { buildDemoData, DEMO_GAME_ID, PREVIOUS_DEMO_GAME_IDS } from '../services/demo';

/** Pose une fois la demo installee, pour qu'elle ne revienne pas apres suppression. */
const DEMO_FLAG = 'gofantome:demoSeeded';

interface State {
  ready: boolean;
  games: StoredGame[];
  sequences: Sequence[];
  attempts: Attempt[];
  hydrate: () => Promise<void>;
  addGame: (g: StoredGame) => Promise<void>;
  removeGame: (id: string) => Promise<void>;
  addSequence: (s: Sequence) => Promise<void>;
  updateSequence: (id: string, patch: Partial<Sequence>) => Promise<void>;
  removeSequence: (id: string) => Promise<void>;
  addAttempt: (a: Attempt) => Promise<void>;
  reload: () => Promise<void>;
  /** (Re)charge la partie et les séquences de démonstration. */
  loadDemo: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  games: [],
  sequences: [],
  attempts: [],

  hydrate: async () => {
    if (get().ready) return;
    const [games, sequences, attempts] = await Promise.all([
      db.loadGames(), db.loadSequences(), db.loadAttempts(),
    ]);

    // Première visite seulement : on installe la démo si l'utilisateur n'a rien à lui.
    const untouched = !games.length && !sequences.length && !localStorage.getItem(DEMO_FLAG);
    if (untouched) {
      try {
        const demo = buildDemoData();
        await Promise.all([db.saveGames([demo.game]), db.saveSequences(demo.sequences)]);
        localStorage.setItem(DEMO_FLAG, '1');
        set({ games: [demo.game], sequences: demo.sequences, attempts, ready: true });
        return;
      } catch {
        // Une démo illisible ne doit pas empêcher l'application de démarrer.
      }
    }

    set({ games, sequences, attempts, ready: true });
  },

  loadDemo: async () => {
    const demo = buildDemoData();
    // On remplace la démo précédente, sans toucher à ce que l'utilisateur a créé.
    const obsolete = new Set([DEMO_GAME_ID, ...PREVIOUS_DEMO_GAME_IDS]);
    const games = [demo.game, ...get().games.filter(g => !obsolete.has(g.id))];
    const sequences = [
      ...demo.sequences,
      ...get().sequences.filter(s => !s.id.startsWith('demo-')),
    ];
    localStorage.setItem(DEMO_FLAG, '1');
    set({ games, sequences });
    await Promise.all([db.saveGames(games), db.saveSequences(sequences)]);
  },

  reload: async () => {
    const [games, sequences, attempts] = await Promise.all([
      db.loadGames(), db.loadSequences(), db.loadAttempts(),
    ]);
    set({ games, sequences, attempts, ready: true });
  },

  addGame: async (g) => {
    const games = [g, ...get().games.filter(x => x.id !== g.id)];
    set({ games });
    await db.saveGames(games);
  },

  removeGame: async (id) => {
    const games = get().games.filter(g => g.id !== id);
    set({ games });
    await db.saveGames(games);
  },

  addSequence: async (s) => {
    const sequences = [s, ...get().sequences];
    set({ sequences });
    await db.saveSequences(sequences);
  },

  updateSequence: async (id, patch) => {
    const sequences = get().sequences.map(s => (s.id === id ? { ...s, ...patch } : s));
    set({ sequences });
    await db.saveSequences(sequences);
  },

  removeSequence: async (id) => {
    const sequences = get().sequences.filter(s => s.id !== id);
    const attempts = get().attempts.filter(a => a.seqId !== id);
    set({ sequences, attempts });
    await Promise.all([db.saveSequences(sequences), db.saveAttempts(attempts)]);
  },

  addAttempt: async (a) => {
    const attempts = [a, ...get().attempts].slice(0, 2000);
    set({ attempts });
    await db.saveAttempts(attempts);
  },
}));
