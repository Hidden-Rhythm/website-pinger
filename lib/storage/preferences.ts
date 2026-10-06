import { UserPreferences, ThemeName, AccentColor } from '../types';

const STORAGE_KEY = 'pulse_preferences_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'oled',
  accent: 'cyan',
  density: 'comfortable',
  animations: true,
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  retentionDays: 30,
  hiddenWidgets: [],
  widgetOrder: ['overview', 'metrics', 'responseChart', 'monitorsList', 'recentIncidents'],
};

export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const current = getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Trigger custom event so other components or tabs update immediately
    window.dispatchEvent(new CustomEvent('pulse-preferences-changed', { detail: updated }));
    return updated;
  } catch (err) {
    console.warn('[Pulse] Failed to save preferences to localStorage:', err);
    return DEFAULT_PREFERENCES;
  }
}

export function resetPreferences(): UserPreferences {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('pulse-preferences-changed', { detail: DEFAULT_PREFERENCES }));
  }
  return DEFAULT_PREFERENCES;
}
