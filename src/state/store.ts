import { create } from 'zustand';
import type { StoredGame, Sequence, Attempt } from '../services/model';
import * as db from '../services/storage';

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
    set({ games, sequences, attempts, ready: true });
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
