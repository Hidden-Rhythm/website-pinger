export type MonitorType = 'http' | 'keyword' | 'json' | 'ssl';

export type MonitorStatus = 'ONLINE' | 'DEGRADED' | 'DOWN' | 'PAUSED' | 'UNMONITORED';

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'OPTIONS';

export interface KeywordAssertion {
  expected: string;
  operator: 'contains' | 'not_contains' | 'does_not_contain';
}

export interface JsonAssertion {
  path: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'exists' | 'not_exists' | 'greater_than' | 'less_than';
  value?: any;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  description?: string;
  tags?: string[];
  monitorType: MonitorType;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  interval: number; // in seconds (e.g. 60, 300)
  timeout: number; // in seconds
  retryCount: number;
  retryDelay: number; // in seconds
  failureThreshold: number;
  recoveryThreshold: number;
  slowResponseThreshold: number; // in ms
  followRedirects: boolean;
  expectedStatusCodes: number[];
  keywordAssertion?: KeywordAssertion;
  jsonAssertion?: JsonAssertion;
  selectedIntegrations?: string[];
  status: MonitorStatus;
  enabled: boolean;
  consecutiveFails: number;
  consecutivePasses: number;
  lastCheckedAt?: number;
  nextCheckAt?: number;
  lastResponseTime?: number;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  checkedAt: number;
  status: 'ONLINE' | 'DEGRADED' | 'DOWN';
  statusCode?: number;
  responseTimeMs: number;
  finalUrl?: string;
  validationPassed: boolean;
  assertionMessage?: string;
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface IncidentTimelineEntry {
  timestamp: number;
  status: MonitorStatus;
  message: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  startedAt: number;
  resolvedAt?: number;
  status: 'ONGOING' | 'RESOLVED';
  reason: string;
  failedChecksCount: number;
  timeline: IncidentTimelineEntry[];
}

export type IntegrationType = 'discord' | 'slack' | 'webhook';

export type NotificationEvent =
  | 'MONITOR_DOWN'
  | 'MONITOR_RECOVERED'
  | 'MONITOR_DEGRADED'
  | 'SLOW_RESPONSE'
  | 'SSL_EXPIRING'
  | 'SSL_EXPIRED'
  | 'STATUS_CHANGED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_RESOLVED';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  webhookUrl: string; // Stored only in IndexedDB, never in localStorage!
  enabled: boolean;
  events: NotificationEvent[];
  customTemplate?: string;
  customHeaders?: Record<string, string>;
  createdAt: number;
}

export interface StatusPageConfig {
  id: string;
  slug: string;
  title: string;
  description: string;
  monitors: string[]; // monitor IDs
  accentColor: string;
  logoUrl?: string;
  showUptime: boolean;
  showIncidents: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  monitorIds: string[]; // ['all'] or list of monitor IDs
  startTime: number;
  endTime: number;
  suppressNotifications: boolean;
  active: boolean;
  createdAt: number;
}

export type ThemeName = 'midnight' | 'carbon' | 'oled' | 'slate' | 'light';
export type AccentColor = 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'custom';

export interface UserPreferences {
  theme: ThemeName;
  accent: AccentColor;
  customAccentHex?: string;
  density: 'comfortable' | 'compact';
  animations: boolean;
  timezone: string;
  dateFormat: string;
  retentionDays: number;
  hiddenWidgets?: string[];
  widgetOrder?: string[];
}
