import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export interface TurnData {
  turn: number;
  tokens: number;
}

export interface TokenTrendChartProps {
  data: TurnData[];
}

export const TokenTrendChart: React.FC<TokenTrendChartProps> = ({ data }) => {
  // Memoize the chart structure to prevent unnecessary SVG re-rendering
  const chart = useMemo(
    () => (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
            itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
          />
          <XAxis dataKey="turn" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#tokenGradient)"
            isAnimationActive={false} // Disable animation for real-time streams
          />
        </AreaChart>
      </ResponsiveContainer>
    ),
    [data]
  );

  return (
    <div className="h-full w-full" style={{ contain: 'layout paint' }}>
      {chart}
    </div>
  );
};
