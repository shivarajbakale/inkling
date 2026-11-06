/** Starting points, loaded from examples/templates/*.inkling and grouped by their `# layout:` line. */
import { frontMatter } from './examples';

export interface Template {
  id: string;
  name: string;
  layout: string;
  description: string;
  source: string;
}

const files = import.meta.glob('../../examples/templates/*.inkling', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Turns a template file into a Template. Front matter is stripped from the source. */
export function readTemplate(path: string, text: string): Template {
  const meta = frontMatter(text);
  const id = path.split('/').pop()!.replace(/\.inkling$/, '');
  const source = text.replace(/^(#\s*\w+:.*\n)+/, '');
  return { id, name: meta.name ?? id, layout: meta.layout ?? 'flow', description: meta.description ?? '', source };
}

export const TEMPLATES: Template[] = Object.keys(files)
  .sort()
  .map((p) => readTemplate(p, files[p]));

/** Layout names in a stable order: flow first, then the order they were added to the docs. */
const ORDER = ['flow', 'free', 'stack', 'cycle', 'timeline', 'compare', 'mindmap', 'sequence'];

export function layoutsOf(list: Template[] = TEMPLATES): string[] {
  const seen = [...new Set(list.map((t) => t.layout))];
  return seen.sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
}

export const LAYOUT_LABELS: Record<string, string> = {
  flow: 'Flow',
  free: 'Free',
  stack: 'Stack',
  cycle: 'Cycle',
  timeline: 'Timeline',
  compare: 'Compare',
  mindmap: 'Mind map',
  sequence: 'Sequence',
};

export const layoutLabel = (l: string) => LAYOUT_LABELS[l] ?? l.charAt(0).toUpperCase() + l.slice(1);

export const BLANK = 'title "New drawing"\n\nstart -> finish\n';
