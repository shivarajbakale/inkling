/**
 * Reads a fence's info string:
 *
 *   ```inkling paper=chalkboard autoplay height=320 alt="The water cycle"
 *
 * Values may be bare (`paper=napkin`) or quoted with " or '. A word with no
 * value is a flag (`autoplay`).
 */
import { isSettingKey } from '../node';

export type Mode = 'client' | 'svg';

export interface FenceInfo {
  /** Setting overrides as written, such as { paper: 'napkin' }. Checked later by the parser. */
  settings: Record<string, string>;
  autoplay: boolean;
  /** False for `controls=none`. */
  controls: boolean;
  /** Pixels, from `height=320`. */
  height?: number;
  alt?: string;
  mode?: Mode;
  /** Problems with the info string itself. */
  problems: string[];
}

/** Splits `a=1 b="x y" c` into pairs. Unquoted values end at whitespace. */
export function tokenizeInfo(meta: string): { key: string; value: string | null }[] {
  const out: { key: string; value: string | null }[] = [];
  const re = /([^\s=]+)(?:=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S*)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(meta))) {
    const [whole, key, dq, sq, bare] = m;
    const hasValue = whole.includes('=');
    const value = !hasValue ? null : (dq ?? sq)?.replace(/\\(.)/g, '$1') ?? bare ?? '';
    out.push({ key, value });
  }
  return out;
}

/** The language word a fence must start with. */
export const LANG = 'inkling';

/** True when an info string (`inkling paper=x`) is an Inkling fence. */
export function isInklingInfo(info: string | null | undefined): boolean {
  return (info ?? '').trim().split(/\s+/)[0] === LANG;
}

export function parseInfo(meta: string | null | undefined): FenceInfo {
  const info: FenceInfo = { settings: {}, autoplay: false, controls: true, problems: [] };
  for (const { key, value } of tokenizeInfo(meta ?? '')) {
    const k = key.toLowerCase();
    if (isSettingKey(k)) {
      if (value === null || value === '') info.problems.push(`"${k}" needs a value, like ${k}=…`);
      else info.settings[k] = value;
    } else if (k === 'autoplay') {
      info.autoplay = value === null || !/^(false|no|0|off)$/i.test(value);
    } else if (k === 'controls') {
      info.controls = !(value !== null && /^(none|false|no|0|off)$/i.test(value));
    } else if (k === 'height') {
      const n = Number(String(value ?? '').replace(/px$/, ''));
      if (!value || !Number.isFinite(n) || n <= 0) info.problems.push(`height should be a number of pixels, like height=320, not "${value ?? ''}".`);
      else info.height = n;
    } else if (k === 'alt') {
      info.alt = value ?? '';
    } else if (k === 'mode') {
      if (value === 'client' || value === 'svg') info.mode = value;
      else info.problems.push(`mode can be "client" or "svg", not "${value ?? ''}".`);
    } else {
      info.problems.push(`Unknown fence option "${key}". Options are any setting (paper, pen, hand, mess, seed, layout), autoplay, controls=none, height, alt and mode.`);
    }
  }
  return info;
}
