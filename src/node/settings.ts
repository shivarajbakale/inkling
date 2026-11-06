import { parse, type Settings } from '../core';

/**
 * Turns `key value` pairs from outside the source (a fence's info string, a
 * command-line flag, a React prop) into setting overrides.
 *
 * Each pair is read by the parser itself, as if it were a line of source, so
 * whatever the language accepts (`layout down`, a new layout name, a paper)
 * works here too, and a bad value gets the parser's own message. Shared by
 * the Node renderer, the Markdown plugins, the CLI and the React wrapper; it
 * needs no DOM.
 */
export interface OverrideProblem {
  key: string;
  value: string;
  message: string;
}

/** Keys that are settings. Anything else is not an override. */
export const SETTING_KEYS = ['paper', 'pen', 'hand', 'mess', 'seed', 'layout', 'direction'] as const;

export function isSettingKey(key: string): boolean {
  return (SETTING_KEYS as readonly string[]).includes(key);
}

const NOT_SETTINGS = new Set(['title', 'version', 'autoSteps', 'diagnostics', 'nodes', 'edges', 'annotations', 'steps', 'groups']);

export function readOverrides(pairs: Record<string, string | number | undefined | null>): {
  overrides: Partial<Settings>;
  problems: OverrideProblem[];
} {
  const base = parse('') as unknown as Record<string, unknown>;
  const overrides: Record<string, unknown> = {};
  const problems: OverrideProblem[] = [];
  for (const [key, raw] of Object.entries(pairs)) {
    if (raw === undefined || raw === null || raw === '') continue;
    const value = String(raw).trim();
    if (!isSettingKey(key)) {
      problems.push({ key, value, message: `"${key}" is not a setting. Settings are ${SETTING_KEYS.join(', ')}.` });
      continue;
    }
    if (/\s/.test(value)) {
      problems.push({ key, value, message: `The ${key} "${value}" has a space in it.` });
      continue;
    }
    const doc = parse(`${key} ${value}`);
    const errors = doc.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length) {
      const e = errors[0];
      problems.push({ key, value, message: `${e.message}${e.hint ? ` ${e.hint}` : ''}` });
      continue;
    }
    // The setting of that name is the override, even when it equals the
    // default, plus whatever else the line changed (`layout down` sets the
    // direction).
    const read = doc as unknown as Record<string, unknown>;
    if (key in read) overrides[key] = read[key];
    for (const [k, v] of Object.entries(read)) {
      if (NOT_SETTINGS.has(k) || (typeof v === 'object' && v !== null)) continue;
      if (v !== base[k]) overrides[k] = v;
    }
  }
  return { overrides: overrides as Partial<Settings>, problems };
}
