import { create } from 'zustand';

export interface TurnData {
  turn: number;
  tokens: number;
}

interface MetricStore {
  history: TurnData[];
  addTurn: (tokens: number) => void;
  setHistory: (history: TurnData[]) => void;
}

export const useMetricsStore = create<MetricStore>((set) => ({
  history: [],
  addTurn: (tokens: number) =>
    set((state) => {
      const nextTurn = state.history.length + 1;
      const newHistory = [...state.history, { turn: nextTurn, tokens }];
      // Keep only the last 50 turns for performance
      return { history: newHistory.slice(-50) };
    }),
  setHistory: (history: TurnData[]) => set({ history: history.slice(-50) }),
}));
