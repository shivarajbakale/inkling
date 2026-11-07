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
  const c = doc.chart;
  const n = (v: number) => String(Math.round(v * 100) / 100);
  if (c.candles.length) lines.push(`${c.candles.length} candles, opening at ${n(c.candles[0][0])} and closing at ${n(c.candles[c.candles.length - 1][3])}.`);
  for (const l of c.lines) {
    if (l.values?.length) lines.push(`${l.label ?? 'Price'}: ${l.values.length} values from ${n(l.values[0])} to ${n(l.values[l.values.length - 1])}.`);
    if (l.points?.length) lines.push(`${l.label ?? 'Curve'}: ${l.points.map(([x, y]) => `${n(x)} → ${n(y)}`).join(', ')}.`);
  }
  for (const z of c.zones) lines.push(`${z.label ?? 'Zone'} from ${n(z.from)} to ${n(z.to)}.`);
  for (const l of c.levels) lines.push(`${l.label ?? 'Level'} at ${n(l.price)}.`);
  for (const t of c.trends) lines.push(`${t.label ?? 'Trend line'} from ${n(t.a[1])} at bar ${n(t.a[0])} to ${n(t.b[1])} at bar ${n(t.b[0])}.`);
  for (const t of c.trades) lines.push(`${t.side === 'buy' ? 'Buy' : 'Sell'} at bar ${t.bar}, price ${n(t.price)}${t.label ? `: ${t.label}` : ''}.`);
  for (const s of c.stops) lines.push(`Stop-loss at ${n(s.price)}.`);
  for (const t of c.targets) lines.push(`Target at ${n(t.price)}.`);
  for (const a of doc.annotations) if (a.kind === 'note' && a.text) lines.push(`Note on ${a.targetKind === 'node' ? label(a.target) : a.target}: ${a.text.replace(/\n/g, ' ')}.`);
  return lines;
}

export function describe(doc: Doc): string {
  return [doc.title ? `${doc.title}.` : '', ...describeLines(doc)].filter(Boolean).join(' ');
}
