import { getIntegrations } from '../storage/integrations';
import { Monitor, Incident, NotificationEvent } from '../types';

export interface NotificationPayloadData {
  monitor_name: string;
  monitor_url: string;
  status: string;
  status_code?: number;
  response_time_ms?: number;
  incident_id?: string;
  downtime?: string;
  reason?: string;
}

export async function dispatchNotification(
  event: NotificationEvent,
  monitor: Monitor,
  extra: {
    incident?: Incident;
    statusCode?: number;
    responseTimeMs?: number;
    reason?: string;
    downtime?: string;
  } = {}
): Promise<void> {
  try {
    const allIntegrations = await getIntegrations();
    const enabledIntegrations = allIntegrations.filter((intg) => {
      if (!intg.enabled) return false;
      // Check event subscription
      if (!intg.events.includes(event)) return false;
      // Check if monitor specified selected integrations
      if (monitor.selectedIntegrations && monitor.selectedIntegrations.length > 0) {
        return monitor.selectedIntegrations.includes(intg.id);
      }
      return true;
    });

    if (enabledIntegrations.length === 0) return;

    const data: NotificationPayloadData = {
      monitor_name: monitor.name,
      monitor_url: monitor.url,
      status: monitor.status,
      status_code: extra.statusCode ?? monitor.lastStatusCode,
      response_time_ms: extra.responseTimeMs ?? monitor.lastResponseTime,
      incident_id: extra.incident?.id,
      downtime: extra.downtime,
      reason: extra.reason ?? monitor.lastErrorMessage,
    };

    // Dispatch concurrently
    await Promise.allSettled(
      enabledIntegrations.map(async (intg) => {
        try {
          await fetch('/api/webhook/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              integration_type: intg.type,
              webhook_url: intg.webhookUrl,
              event,
              data,
              custom_headers: intg.customHeaders,
              custom_template: intg.customTemplate,
            }),
          });
        } catch (err) {
          console.warn(`[Pulse] Failed to dispatch ${intg.type} notification:`, err);
        }
      })
    );
  } catch (err) {
    console.error('[Pulse] Error during notification dispatch:', err);
  }
}
