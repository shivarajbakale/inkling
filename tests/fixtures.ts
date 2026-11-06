import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '../src/core';

const files = import.meta.glob('../examples/{gallery,docs,fixtures,templates}/*.inkling', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Every example and fixture source, by short name. */
export const FIXTURES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, text]) => [path.split('/').slice(-2).join('/').replace(/\.inkling$/, ''), text]),
);

/** Renders to a stable, line-per-tag SVG string for golden comparison. */
export function renderSVG(source: string, document?: Document): string {
  const { drawing } = render(source, {}, { idPrefix: 'g', document });
  const xml = new (globalThis.XMLSerializer ?? (document as unknown as { defaultView: typeof globalThis }).defaultView.XMLSerializer)().serializeToString(
    drawing.svg,
  );
  return xml.replace(/></g, '>\n<') + '\n';
}

/** Compares against tests/golden/<name>.svg. UPDATE_GOLDEN=1 rewrites it. */
export function golden(name: string, actual: string): { expected: string; actual: string } {
  const file = resolve(__dirname, 'golden', name.replace(/\//g, '__') + '.svg');
  if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, actual);
  return { expected: readFileSync(file, 'utf8'), actual };
}
