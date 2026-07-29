import { create } from 'zustand';

export interface TokenMetricsState {
  totalTokens: number;
  estCost: number;
  contextUsage: number;
  cacheHitRate: number;
  history: Array<{ turn: number; tokens: number; cost?: number }>;
}

interface TokenMetricsStore {
  metrics: TokenMetricsState;
  updateMetrics: (delta: Partial<TokenMetricsState>) => void;
  resetMetrics: () => void;
}

export const useTokenMetrics = create<TokenMetricsStore>((set) => ({
  metrics: { totalTokens: 0, estCost: 0, contextUsage: 0, cacheHitRate: 0, history: [] },
  updateMetrics: (delta) =>
    set((state) => ({
      metrics: { ...state.metrics, ...delta },
    })),
  resetMetrics: () =>
    set({
      metrics: { totalTokens: 0, estCost: 0, contextUsage: 0, cacheHitRate: 0, history: [] },
    }),
}));
