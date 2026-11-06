export { parse } from './syntax/parser';

/**
 * Rewrites one setting line (`paper notebook`) in the source, or inserts it
 * after the title. Keeps code the single source of truth when a control changes.
 */
export function setDirective(source: string, key: string, value: string | number): string {
  const re = new RegExp(`^(\\s*)${key}\\s+[\\w.-]+\\s*$`, 'm');
  if (re.test(source)) return source.replace(re, `$1${key} ${value}`);
  const lines = source.split('\n');
  const titleAt = lines.findIndex((l) => /^\s*title\s/.test(l));
  let insertAt = titleAt + 1;
  while (insertAt < lines.length && /^\s*(paper|pen|hand|mess|seed|layout|direction)\s/.test(lines[insertAt])) insertAt++;
  lines.splice(insertAt, 0, `${key} ${value}`);
  return lines.join('\n');
}
