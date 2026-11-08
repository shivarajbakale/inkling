import { wrapText } from '../labels';
import { measure } from '../measure';
import type { Decoration, LayoutFn, Owner, Pt } from '../scene';
import type { FrameDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics } from './shared';

/**
 * Who talks to whom, in order. Participants are nodes, left to right as
 * written, each with a lifeline. Arrows are messages, top to bottom in source
 * order; notes sit at the row where they are written. `activate x` and
 * `deactivate x` draw a narrow box on x's lifeline. Frames (`loop`, `opt`,
 * `alt` … `else`, `par` … `and`) box in the messages written inside them.
 */
export const sequence: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'sequence', { tilt: 0.8, stickyTilt: 3, jitterX: 0, jitterY: 0 });
  const { px, family, weight } = textMetrics(doc);
  const people = inOrder(doc);
  const sizes = people.map((d) => sizeDef(doc, d));
  const index = new Map(people.map((d, k) => [d.id, k]));
  const labelPx = px * 0.82;

  // Columns: far enough apart for the boxes and for every message label between them.
  const xs: number[] = [];
  people.forEach((_, k) => {
    if (k === 0) xs.push(50 + sizes[0].w / 2);
    else xs.push(xs[k - 1] + Math.max(sizes[k - 1].w / 2 + sizes[k].w / 2 + 40, 130));
  });
  for (let pass = 0; pass < 3; pass++)
    for (const e of doc.edges) {
      const a = index.get(e.from)!;
      const b = index.get(e.to)!;
      if (a === b || !e.label) continue;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const need = measure(e.label, labelPx, family, weight).w + 36;
      const have = xs[hi] - xs[lo];
      if (have < need) for (let k = hi; k < xs.length; k++) xs[k] += need - have;
    }
  const headerH = Math.max(0, ...sizes.map((s) => s.h));
  const top = 30 + headerH / 2;
  people.forEach((d, k) => placeNode(scene, doc, d, xs[k], top));

  // Rows, in source order: messages, notes and activations.
  type Row =
    | { kind: 'edge'; i: number }
    | { kind: 'note'; i: number }
    | { kind: 'act'; i: number }
    | { kind: 'branch'; f: FrameDef; b: number }
    | { kind: 'end'; f: FrameDef };
  const rows: { order: number; row: Row }[] = [
    ...doc.edges.map((e, i) => ({ order: e.order, row: { kind: 'edge' as const, i } })),
    ...doc.annotations.map((a, i) => ({ order: a.order, row: { kind: 'note' as const, i } })).filter((r) => doc.annotations[r.row.i].kind === 'note'),
    ...doc.activations.map((a, i) => ({ order: a.order, row: { kind: 'act' as const, i } })),
    ...doc.frames.flatMap((f) => [
      ...f.branches.map((br, b) => ({ order: br.order, row: { kind: 'branch' as const, f, b } })),
      { order: f.end, row: { kind: 'end' as const, f } },
    ]),
  ].sort((a, b) => a.order - b.order);

  // Frames: where each one starts, its dividers, and how wide the things inside it are.
  const tabPx = labelPx * 0.95;
  const tabH = measure('Hg', tabPx, family, weight).h + 10;
  const frameTop = new Map<FrameDef, number>();
  const dividers = new Map<FrameDef, { y: number; label?: string; order: number }[]>();
  const spans: { order: number; x0: number; x1: number }[] = [];
  const frameBoxes: { f: FrameDef; x0: number; x1: number; top: number; bottom: number }[] = [];

  let y = 30 + headerH + 30;
  const edgeStep = new Map<number, number>();
  const markStep = new Map<number, number>();
  const active = new Map<string, number>();
  let step = 1;
  let lastY = y;
  for (const { row } of rows) {
    if (row.kind === 'edge') {
      const e = doc.edges[row.i];
      const a = index.get(e.from)!;
      const b = index.get(e.to)!;
      const lh = e.label ? measure(e.label, labelPx, family, weight).h : 0;
      y += lh + 12;
      const sceneEdge = scene.edges[row.i];
      if (a === b) {
        const x = xs[a];
        sceneEdge.points = [
          [x + 4, y],
          [x + 46, y],
          [x + 46, y + 22],
          [x + 8, y + 22],
        ];
        y += 22;
      } else {
        const dir = b > a ? 1 : -1;
        sceneEdge.points = [
          [xs[a] + dir * 4, y],
          [xs[b] - dir * 8, y],
        ];
      }
      sceneEdge.fixed = true;
      const exs = sceneEdge.points.map((p) => p[0]);
      spans.push({ order: e.order, x0: Math.min(...exs), x1: Math.max(...exs) + (a === b ? 8 : 0) });
      // Labels above the line.
      sceneEdge.bend = b >= a ? -20 : 20;
      step++;
      edgeStep.set(row.i, step);
      y += 22;
    } else if (row.kind === 'note') {
      const a = doc.annotations[row.i];
      const k = index.get(a.target);
      if (k === undefined || !a.text) continue;
      const text = wrapText(a.text);
      const m = measure(text, px * 0.86, family, weight);
      y += 6;
      if (a.over) {
        // A card centred on one lifeline, or spanning two.
        const ks = a.over.map((id) => index.get(id) ?? k);
        const lo = Math.min(...ks);
        const hi = Math.max(...ks);
        const cx = (xs[lo] + xs[hi]) / 2;
        const w = Math.max(m.w + 24, xs[hi] - xs[lo] + 70);
        const h = m.h + 14;
        scene.labels.set(`note:${row.i}`, { key: `note:${row.i}`, text, px: px * 0.86, box: { x: cx - w / 2, y, w, h }, card: true });
        spans.push({ order: a.order, x0: cx - w / 2, x1: cx + w / 2 });
        markStep.set(row.i, step);
        y += h + 14;
        lastY = y;
        continue;
      }
      scene.labels.set(`note:${row.i}`, { key: `note:${row.i}`, text, px: px * 0.86, box: { x: xs[k] + 30, y, w: m.w, h: m.h }, anchor: [xs[k] + 5, y + m.h / 2] });
      spans.push({ order: a.order, x0: xs[k], x1: xs[k] + 30 + m.w });
      markStep.set(row.i, step);
      y += m.h + 14;
    } else if (row.kind === 'branch') {
      const { f, b } = row;
      const label = f.branches[b].label;
      if (b === 0) {
        y += 10;
        frameTop.set(f, y);
        y += tabH + 4;
      } else {
        y += 12;
        dividers.set(f, [...(dividers.get(f) ?? []), { y, label, order: f.branches[b].order }]);
        y += label ? measure(label, tabPx, family, weight).h + 6 : 6;
      }
    } else if (row.kind === 'end') {
      const f = row.f;
      y += 12;
      const inside = spans.filter((sp) => sp.order > f.order && sp.order < f.end);
      const pad = 22;
      let x0 = inside.length ? Math.min(...inside.map((sp) => sp.x0)) - pad : xs[0] - 60;
      let x1 = inside.length ? Math.max(...inside.map((sp) => sp.x1)) + pad : xs[0] + 60;
      const head = measure(f.kind, tabPx, family, Math.min(700, weight + 200)).w + 18;
      const guard = f.branches[0].label ? measure(`[${f.branches[0].label}]`, tabPx, family, weight).w + 20 : 0;
      if (x1 - x0 < head + guard + 24) x1 = x0 + head + guard + 24;
      x0 = Math.max(8, x0);
      frameBoxes.push({ f, x0, x1, top: frameTop.get(f) ?? y - 30, bottom: y });
      spans.push({ order: f.order, x0, x1 });
      y += 8;
    } else {
      const act = doc.activations[row.i];
      if (act.on) active.set(act.id, y);
      else {
        const from = active.get(act.id);
        if (from !== undefined) {
          const x = xs[index.get(act.id)!];
          scene.decorations.push({ kind: 'box', box: { x: x - 7, y: from, w: 14, h: Math.max(16, y - from) }, fill: 'rgba(127,127,127,0.18)', owner: { node: act.id } });
          active.delete(act.id);
        }
      }
    }
    lastY = y;
  }
  const bottom = lastY + 26;
  for (const [id, from] of active) {
    const x = xs[index.get(id)!];
    scene.decorations.push({ kind: 'box', box: { x: x - 7, y: from, w: 14, h: Math.max(16, bottom - 10 - from) }, fill: 'rgba(127,127,127,0.18)', owner: { node: id } });
  }

  // Frame ink: the box, a notched tab with the kind, the condition, and dashed dividers.
  const firstEdgeIn = (from: number, to: number): Owner | undefined => {
    let best: number | undefined;
    doc.edges.forEach((e, i) => {
      if (e.order > from && e.order < to && (best === undefined || e.order < doc.edges[best].order)) best = i;
    });
    return best === undefined ? undefined : { edge: best };
  };
  for (const { f, x0, x1, top, bottom } of frameBoxes) {
    const owner = firstEdgeIn(f.order, f.end) ?? (people[0] ? { node: people[0].id } : undefined);
    const head = measure(f.kind, tabPx, family, Math.min(700, weight + 200)).w + 18;
    const ink: Decoration[] = [
      { kind: 'box', box: { x: x0, y: top, w: x1 - x0, h: bottom - top }, frame: true },
      { kind: 'line', points: [[x0, top + tabH], [x0 + head, top + tabH], [x0 + head + 9, top + tabH - 9], [x0 + head + 9, top]], width: 1.4, straight: true },
      { kind: 'text', x: x0 + head / 2 + 1, y: top + tabH / 2, text: f.kind, px: tabPx, bold: true },
    ];
    if (f.branches[0].label) ink.push({ kind: 'text', x: x0 + head + 20, y: top + tabH / 2, text: `[${f.branches[0].label}]`, px: tabPx, anchor: 'start' });
    for (const d of dividers.get(f) ?? []) {
      const next = f.branches.find((br) => br.order > d.order)?.order ?? f.end;
      const own = firstEdgeIn(d.order, next) ?? owner;
      ink.push({ kind: 'line', points: [[x0, d.y], [x1, d.y]], dashed: true, width: 1.3, owner: own });
      if (d.label) ink.push({ kind: 'text', x: x0 + 12, y: d.y + measure(d.label, tabPx, family, weight).h / 2 + 5, text: `[${d.label}]`, px: tabPx, anchor: 'start', owner: own });
    }
    for (const d of ink) scene.decorations.push({ owner, ...d });
  }

  // Lifelines, drawn first so boxes and messages sit on top.
  people.forEach((d, k) => {
    const lines: Pt[] = [
      [xs[k], top + sizes[k].h / 2 + 4],
      [xs[k], bottom],
    ];
    scene.decorations.unshift({ kind: 'line', points: lines, dashed: true, width: 1.2, owner: { node: d.id } });
  });

  // Long conversations repeat the participants at the bottom.
  if (doc.footer && doc.edges.length > 8) {
    people.forEach((d, k) => {
      const s = sizes[k];
      scene.decorations.push({ kind: 'box', box: { x: xs[k] - s.w / 2, y: bottom + 6, w: s.w, h: Math.min(s.h, 44) }, owner: { node: d.id } });
      scene.decorations.push({ kind: 'text', x: xs[k], y: bottom + 6 + Math.min(s.h, 44) / 2, text: d.label, px, owner: { node: d.id } });
    });
  }

  // Steps: everyone appears first, then one message per step.
  scene.autoSteps = { nodes: new Map(people.map((d) => [d.id, 1])), edges: edgeStep, marks: markStep };
  fitScene(scene);
  return scene;
};
