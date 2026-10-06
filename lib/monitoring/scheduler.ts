import { Monitor, CheckResult, Incident } from '../types';
import { getMonitors, updateMonitor } from '../storage/monitors';
import { saveCheck, pruneChecks } from '../storage/checks';
import { getActiveIncidents, createIncident, resolveIncident, updateIncident } from '../storage/incidents';
import { dispatchNotification } from '../notifications/clientDispatcher';
import { getPreferences } from '../storage/preferences';
import { MONITOR_LIMITS } from './constants';

type SchedulerListener = () => void;

class MonitoringScheduler {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private inFlightChecks: Set<string> = new Set();
  private lastTickTime: number = Date.now();
  private lastPruneTime: number = 0;
  private isOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<SchedulerListener> = new Set();

  public subscribe(listener: SchedulerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pulse-state-updated'));
    }
  }

  public start(): void {
    if (this.isRunning || typeof window === 'undefined') return;

    this.isRunning = true;
    this.lastTickTime = Date.now();

    // Register lifecycle listeners
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Initial catch-up check
    this.tick();

    // Run central tick every 3 seconds
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 3000);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  public getStatus(): { isRunning: boolean; isOnline: boolean; inFlightCount: number } {
    return {
      isRunning: this.isRunning,
      isOnline: this.isOnline,
      inFlightCount: this.inFlightChecks.size,
    };
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // User returned to tab - trigger immediate tick for due monitors
      this.tick();
    }
  };

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyChange();
    this.tick();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyChange();
  };

  public async checkNow(monitorId: string): Promise<CheckResult | null> {
    const monitors = await getMonitors();
    const target = monitors.find((m) => m.id === monitorId);
    if (!target) return null;
    return this.executeCheck(target);
  }

  private async tick(): Promise<void> {
    if (!this.isRunning || !this.isOnline) return;

    const now = Date.now();

    // Detect browser wake from sleep (if elapsed time is suspiciously long)
    if (now - this.lastTickTime > 15000) {
      console.log('[Pulse] Browser wake detected. Recalculating due monitors.');
    }
    this.lastTickTime = now;

    // Periodic pruning once every hour
    if (now - this.lastPruneTime > 3600000) {
      this.lastPruneTime = now;
      const prefs = getPreferences();
      pruneChecks(prefs.retentionDays || 30).catch(console.error);
    }

    try {
      const monitors = await getMonitors();
      const enabledMonitors = monitors.filter((m) => m.enabled && m.status !== 'PAUSED');

      // Identify due monitors
      const dueMonitors: Monitor[] = [];
      for (const m of enabledMonitors) {
        if (this.inFlightChecks.has(m.id)) continue;

        const intervalMs = (m.interval || MONITOR_LIMITS.DEFAULT_CHECK_INTERVAL_SECONDS) * 1000;
        const lastChecked = m.lastCheckedAt || 0;

        if (lastChecked === 0 || now - lastChecked >= intervalMs) {
          dueMonitors.push(m);
        }
      }

      // Check due monitors within concurrency limit
      const availableSlots = MONITOR_LIMITS.MAX_CONCURRENT_CHECKS - this.inFlightChecks.size;
      const toExecute = dueMonitors.slice(0, Math.max(0, availableSlots));

      for (const monitor of toExecute) {
        this.executeCheck(monitor);
      }
    } catch (err) {
      console.error('[Pulse Scheduler] Tick error:', err);
    }
  }

  private async executeCheck(monitor: Monitor): Promise<CheckResult | null> {
    if (this.inFlightChecks.has(monitor.id)) return null;
    this.inFlightChecks.add(monitor.id);
    this.notifyChange();

    const checkedAt = Date.now();
    let checkResult: CheckResult;

    try {
      if (monitor.monitorType === 'ssl') {
        const response = await fetch('/api/check/ssl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: monitor.url,
            timeout: monitor.timeout || 10,
          }),
        });
        const data = await response.json();
        const success = data.success && data.valid;

        checkResult = {
          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          monitorId: monitor.id,
          checkedAt,
          status: success ? 'ONLINE' : 'DOWN',
          responseTimeMs: 0,
          validationPassed: !!data.valid,
          assertionMessage: data.valid
            ? `SSL valid (${data.days_remaining} days left)`
            : (data.error?.message || 'SSL validation failed'),
          error: success ? null : (data.error || { code: 'SSL_FAILED', message: 'Certificate invalid' }),
        };
      } else {
        const response = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: monitor.url,
            method: monitor.method || 'GET',
            headers: monitor.headers,
            body: monitor.body,
            timeout: monitor.timeout || 10,
            follow_redirects: monitor.followRedirects ?? true,
            expected_status_codes: monitor.expectedStatusCodes,
            monitor_type: monitor.monitorType || 'http',
            keyword_assertion: monitor.keywordAssertion,
            json_assertion: monitor.jsonAssertion,
          }),
        });

        const data = await response.json();
        const isSuccess = !!data.success;
        const respTime = typeof data.response_time_ms === 'number' ? data.response_time_ms : 0;

        let status: 'ONLINE' | 'DEGRADED' | 'DOWN' = 'DOWN';
        if (isSuccess) {
          status = respTime > (monitor.slowResponseThreshold || 1500) ? 'DEGRADED' : 'ONLINE';
        }

        checkResult = {
          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          monitorId: monitor.id,
          checkedAt,
          status,
          statusCode: data.status_code,
          responseTimeMs: respTime,
          finalUrl: data.final_url,
          validationPassed: !!data.validation_passed,
          assertionMessage: data.assertion_message,
          error: data.error,
        };
      }

      // Save check result to IndexedDB
      await saveCheck(checkResult);

      // Process incident & status transitions
      await this.processMonitorTransition(monitor, checkResult);

      return checkResult;
    } catch (err: any) {
      console.error(`[Pulse] Check execution error for ${monitor.name}:`, err);
      const failedResult: CheckResult = {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        monitorId: monitor.id,
        checkedAt,
        status: 'DOWN',
        responseTimeMs: 0,
        validationPassed: false,
        error: { code: 'EXECUTION_ERROR', message: err.message || 'Network request failed' },
      };
      await saveCheck(failedResult);
      await this.processMonitorTransition(monitor, failedResult);
      return failedResult;
    } finally {
      this.inFlightChecks.delete(monitor.id);
      this.notifyChange();
    }
  }

  private async processMonitorTransition(monitor: Monitor, check: CheckResult): Promise<void> {
    const isSuccess = check.status === 'ONLINE' || check.status === 'DEGRADED';
    const activeIncidents = await getActiveIncidents();
    const existingIncident = activeIncidents.find((inc) => inc.monitorId === monitor.id);

    let nextFails = isSuccess ? 0 : monitor.consecutiveFails + 1;
    let nextPasses = isSuccess ? monitor.consecutivePasses + 1 : 0;
    let nextStatus: Monitor['status'] = monitor.status;

    const failureThreshold = monitor.failureThreshold || 2;
    const recoveryThreshold = monitor.recoveryThreshold || 1;

    if (!isSuccess) {
      if (nextFails >= failureThreshold) {
        nextStatus = 'DOWN';
        // If no existing incident, create one
        if (!existingIncident) {
          const newIncident: Incident = {
            id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            monitorId: monitor.id,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            startedAt: check.checkedAt,
            status: 'ONGOING',
            reason: check.error?.message || check.assertionMessage || `Failed with status ${check.statusCode || 'Unknown'}`,
            failedChecksCount: nextFails,
            timeline: [
              {
                timestamp: check.checkedAt,
                status: 'DOWN',
                message: check.error?.message || 'Check failed threshold',
              },
            ],
          };
          await createIncident(newIncident);

          // Dispatch notification
          dispatchNotification('MONITOR_DOWN', { ...monitor, status: 'DOWN' }, {
            incident: newIncident,
            statusCode: check.statusCode,
            responseTimeMs: check.responseTimeMs,
            reason: newIncident.reason,
          });
          dispatchNotification('INCIDENT_CREATED', { ...monitor, status: 'DOWN' }, {
            incident: newIncident,
          });
        } else {
          // Update failed checks count
          await updateIncident(existingIncident.id, {
            failedChecksCount: existingIncident.failedChecksCount + 1,
            timeline: [
              ...existingIncident.timeline,
              {
                timestamp: check.checkedAt,
                status: 'DOWN',
                message: check.error?.message || 'Consecutive failure',
              },
            ],
          });
        }
      } else {
        nextStatus = 'DEGRADED';
      }
    } else {
      // Check succeeded
      if (existingIncident) {
        if (nextPasses >= recoveryThreshold) {
          nextStatus = check.status;
          const downtimeMs = check.checkedAt - existingIncident.startedAt;
          const downtimeMinutes = Math.floor(downtimeMs / 60000);
          const downtimeSecs = Math.floor((downtimeMs % 60000) / 1000);
          const downtimeStr = `${downtimeMinutes}m ${downtimeSecs}s`;

          await resolveIncident(existingIncident.id, `Service recovered with status code ${check.statusCode || 200}`);

          // Dispatch recovery notification
          dispatchNotification('MONITOR_RECOVERED', { ...monitor, status: nextStatus }, {
            incident: existingIncident,
            statusCode: check.statusCode,
            responseTimeMs: check.responseTimeMs,
            downtime: downtimeStr,
          });
          dispatchNotification('INCIDENT_RESOLVED', { ...monitor, status: nextStatus }, {
            incident: existingIncident,
          });
        }
      } else {
        nextStatus = check.status;
        if (check.status === 'DEGRADED') {
          dispatchNotification('MONITOR_DEGRADED', { ...monitor, status: 'DEGRADED' }, {
            responseTimeMs: check.responseTimeMs,
            reason: `Response time ${check.responseTimeMs}ms exceeded threshold ${monitor.slowResponseThreshold}ms`,
          });
        }
      }
    }

    const nextCheckAt = Date.now() + (monitor.interval || MONITOR_LIMITS.DEFAULT_CHECK_INTERVAL_SECONDS) * 1000;

    await updateMonitor(monitor.id, {
      status: nextStatus,
      consecutiveFails: nextFails,
      consecutivePasses: nextPasses,
      lastCheckedAt: check.checkedAt,
      nextCheckAt,
      lastResponseTime: check.responseTimeMs,
      lastStatusCode: check.statusCode,
      lastErrorMessage: check.error?.message,
      updatedAt: Date.now(),
    });
  }
}

// Global Singleton
export const globalScheduler = new MonitoringScheduler();
