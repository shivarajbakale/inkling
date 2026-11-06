/** App settings, kept in localStorage. Everything works without it. */
import { useCallback, useState } from 'react';

export interface AppSettings {
  /** Animation speed multiplier for the player. */
  speed: number;
  /** Play the draw-on animation when a drawing opens. */
  autoplay: boolean;
  /** Editor font size in px. */
  fontSize: number;
}

export const DEFAULT_SETTINGS: AppSettings = { speed: 1, autoplay: true, fontSize: 13 };
const KEY = 'inkling.settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const v = JSON.parse(raw) as Partial<AppSettings>;
    return {
      speed: typeof v.speed === 'number' && v.speed > 0 && v.speed <= 4 ? v.speed : DEFAULT_SETTINGS.speed,
      autoplay: typeof v.autoplay === 'boolean' ? v.autoplay : DEFAULT_SETTINGS.autoplay,
      fontSize: typeof v.fontSize === 'number' && v.fontSize >= 10 && v.fontSize <= 24 ? v.fontSize : DEFAULT_SETTINGS.fontSize,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const [settings, set] = useState(loadSettings);
  const update = useCallback((patch: Partial<AppSettings>) => {
    set((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: keep it for this visit */
      }
      return next;
    });
  }, []);
  return [settings, update];
}

/** Small localStorage helpers that never throw. */
export const local = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};
