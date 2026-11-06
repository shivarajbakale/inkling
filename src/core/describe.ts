import type { Doc } from './types';

/**
 * A plain-language description of a diagram, for screen readers and for the
 * SVG's <desc>. Lists what is grouped, then every arrow in source order,
 * then any notes.
 */
export function describeLines(doc: Doc): string[] {
  const label = (id: string) => (doc.nodes.find((n) => n.id === id)?.label ?? id).replace(/\n/g, ' ');
  const lines: string[] = [];
  for (const g of doc.groups) lines.push(`${g.label} contains ${g.members.map(label).join(', ')}.`);
  for (const e of doc.edges) {
    const arrow = e.both ? '↔' : '→';
    lines.push(`${label(e.from)} ${arrow} ${label(e.to)}${e.label ? `: ${e.label.replace(/\n/g, ' ')}` : ''}.`);
  }
  const linked = new Set(doc.edges.flatMap((e) => [e.from, e.to]));
  const alone = doc.nodes.filter((n) => !linked.has(n.id));
  if (alone.length) lines.push(`Also shown: ${alone.map((n) => label(n.id)).join(', ')}.`);
  for (const a of doc.annotations) if (a.kind === 'note' && a.text) lines.push(`Note on ${a.targetKind === 'node' ? label(a.target) : a.target}: ${a.text.replace(/\n/g, ' ')}.`);
  return lines;
}

export function describe(doc: Doc): string {
  return [doc.title ? `${doc.title}.` : '', ...describeLines(doc)].filter(Boolean).join(' ');
}
