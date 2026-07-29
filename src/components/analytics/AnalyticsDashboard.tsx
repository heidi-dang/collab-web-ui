import React from 'react';
import { useMetricsStore } from '../../store/useMetricsStore';
import { TokenTrendChart } from './TokenTrendChart';

export interface AnalyticsDashboardProps {
  // Optional external data if passed directly
  data?: Array<{ turn: number; tokens: number }>;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const { history } = useMetricsStore();
  const chartData = data && data.length > 0 ? data : history;

  return (
    <div className="h-[200px] w-full mt-4">
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Real-time Token Trend
      </h4>
      <TokenTrendChart data={chartData} />
    </div>
  );
};
