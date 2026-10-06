'use client';

import React from 'react';
import { CheckResult } from '@/lib/types';

interface UptimeBarsProps {
  checks: CheckResult[];
  maxBars?: number;
}

export function UptimeBars({ checks, maxBars = 40 }: UptimeBarsProps) {
  // Pad or take the most recent maxBars
  const recentChecks = checks.slice(-maxBars);

  if (recentChecks.length === 0) {
    return (
      <div className="flex items-center gap-1 w-full py-2">
        <span className="text-xs text-text-muted">No check blocks recorded yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 w-full overflow-hidden" title="Recent Check History">
      {recentChecks.map((chk, i) => {
        let color = 'bg-emerald-500 hover:bg-emerald-400';
        if (chk.status === 'DEGRADED') color = 'bg-amber-500 hover:bg-amber-400';
        if (chk.status === 'DOWN') color = 'bg-rose-500 hover:bg-rose-400';

        const timeStr = new Date(chk.checkedAt).toLocaleTimeString();
        const tooltip = `${chk.status} at ${timeStr} (${chk.responseTimeMs}ms)`;

        return (
          <div
            key={chk.id || i}
            title={tooltip}
            className={`h-7 flex-1 min-w-[3px] rounded-sm transition-all duration-150 cursor-pointer ${color}`}
          />
        );
      })}
    </div>
  );
}
