'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { CheckResult } from '@/lib/types';

interface ResponseChartProps {
  checks: CheckResult[];
  height?: number;
  showGrid?: boolean;
}

export function ResponseChart({ checks, height = 240, showGrid = true }: ResponseChartProps) {
  if (!checks || checks.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-text-muted text-xs"
      >
        <span>No check history data available yet</span>
        <span className="text-[11px] text-text-secondary/60 mt-1">
          Checks will populate here while Pulse remains open.
        </span>
      </div>
    );
  }

  const data = checks.map((c) => {
    const d = new Date(c.checkedAt);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: c.checkedAt,
      responseTime: c.status === 'DOWN' ? null : c.responseTimeMs,
      statusCode: c.statusCode,
      status: c.status,
    };
  });

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />}
          <XAxis
            dataKey="time"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            unit="ms"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="glass-panel p-2.5 rounded-lg border border-border shadow-lg text-xs space-y-1">
                    <div className="text-text-muted font-mono">{item.time}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Latency:</span>
                      <span className="font-semibold text-accent">
                        {item.responseTime !== null ? `${item.responseTime} ms` : 'Failed'}
                      </span>
                    </div>
                    {item.statusCode && (
                      <div className="flex items-center gap-2 text-text-muted">
                        <span>Code:</span>
                        <span className="font-mono text-text-primary">{item.statusCode}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="var(--accent)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latencyGradient)"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
