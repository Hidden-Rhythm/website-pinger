import { CheckResult } from '../types';

export interface PerformanceStats {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

export interface UptimeCalculation {
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  monitoredTimeSeconds: number;
  unmonitoredTimeSeconds: number;
  monitoredFormatted: string;
  unmonitoredFormatted: string;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function calculatePerformanceStats(checks: CheckResult[]): PerformanceStats {
  const times = checks
    .filter((c) => c.status === 'ONLINE' || c.status === 'DEGRADED')
    .map((c) => c.responseTimeMs)
    .filter((t) => typeof t === 'number' && t > 0)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
  }

  const sum = times.reduce((acc, val) => acc + val, 0);
  const average = Math.round(sum / times.length);
  const min = times[0];
  const max = times[times.length - 1];

  const getPercentile = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * times.length), times.length - 1);
    return Math.round(times[idx]);
  };

  return {
    average,
    median: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    min,
    max,
    count: times.length,
  };
}

export function calculateUptime(
  checks: CheckResult[],
  timeframeSeconds: number,
  expectedIntervalSeconds: number = 60
): UptimeCalculation {
  if (checks.length === 0) {
    return {
      uptimePercentage: 100,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      monitoredTimeSeconds: 0,
      unmonitoredTimeSeconds: timeframeSeconds,
      monitoredFormatted: '0m',
      unmonitoredFormatted: formatDuration(timeframeSeconds),
    };
  }

  // Count checks
  const totalChecks = checks.length;
  const successfulChecks = checks.filter((c) => c.status === 'ONLINE' || c.status === 'DEGRADED').length;
  const failedChecks = totalChecks - successfulChecks;

  // Real uptime percentage based on actual checks
  const uptimePercentage = Math.round((successfulChecks / totalChecks) * 10000) / 100;

  // Approximate monitored time based on check intervals
  const monitoredSeconds = Math.min(timeframeSeconds, totalChecks * expectedIntervalSeconds);
  const unmonitoredSeconds = Math.max(0, timeframeSeconds - monitoredSeconds);

  return {
    uptimePercentage,
    totalChecks,
    successfulChecks,
    failedChecks,
    monitoredTimeSeconds: monitoredSeconds,
    unmonitoredTimeSeconds: unmonitoredSeconds,
    monitoredFormatted: formatDuration(monitoredSeconds),
    unmonitoredFormatted: formatDuration(unmonitoredSeconds),
  };
}
