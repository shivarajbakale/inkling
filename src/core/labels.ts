import { markTarget, nodeBox } from './arrange';
import { measure } from './measure';
import type { Box, PlacedLabel, Pt, Scene } from './scene';
import type { Doc } from './types';

/**
 * One pass that places every movable label — arrow labels and notes — so
 * they keep clear of nodes, lines and each other. The most constrained
 * labels choose first; a second pass lets each one move to a better spot.
 */

interface Candidate {
  box: Box;
  /** Cost of this spot before collisions: being away from the ideal place. */
  base: number;
}

interface Request {
  key: string;
  text: string;
  px: number;
  candidates: Candidate[];
  /** Points of lines this label should not sit on. Its own arrow's line is excluded. */
  ownEdge?: number;
  note: boolean;
}

export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function along(pts: Pt[], d: number): { p: Pt; dir: Pt } {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= d || i === pts.length - 1) {
      const t = seg ? Math.min(1, Math.max(0, (d - acc) / seg)) : 0;
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / (seg || 1), (b[1] - a[1]) / (seg || 1)] };
    }
    acc += seg;
  }
  return { p: pts[0], dir: [1, 0] };
}

function length(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** Wraps note text at about `max` characters per line, keeping written line breaks. */
export function wrapText(text: string, max = 24): string {
  return text
    .split('\n')
    .map((para) => {
      const out: string[] = [];
      let cur = '';
      for (const w of para.split(' ')) {
        if ((cur + ' ' + w).trim().length > max && cur) {
          out.push(cur);
          cur = w;
        } else cur = (cur + ' ' + w).trim();
      }
      if (cur) out.push(cur);
      return out.join('\n');
    })
    .join('\n');
}

function edgeLabelRequest(scene: Scene, index: number, text: string): Request {
  const e = scene.edges[index];
  const pts = e.points;
  const px = scene.fontPx * 0.82;
  const m = measure(text, px, scene.family, scene.weight);
  const len = length(pts);
  const { dir } = along(pts, len / 2);
  const horizontal = Math.abs(dir[0]) >= Math.abs(dir[1]);
  // Preferred side: outside of a fanned or detoured arrow, else above a flat line or right of a steep one.
  let nx = -dir[1];
  let ny = dir[0];
  const flip = Math.abs(e.bend) > 10 ? e.bend < 0 : horizontal ? ny > 0 : nx < 0;
  if (flip) {
    nx = -nx;
    ny = -ny;
  }
  const candidates: Candidate[] = [];
  [0.5, 0.36, 0.64, 0.25, 0.75].forEach((f, fi) => {
    for (const [side, push] of [[1, 0], [-1, 0], [1, 12], [-1, 12]]) {
      const at = along(pts, len * f);
      let ax = -at.dir[1];
      let ay = at.dir[0];
      if (ax * nx + ay * ny < 0) {
        ax = -ax;
        ay = -ay;
      }
      const sx = ax * side;
      const sy = ay * side;
      const off = (Math.abs(sy) >= Math.abs(sx) ? m.h / 2 + 5 : m.w / 2 + 8) + push;
      const cx = at.p[0] + sx * off;
      const cy = at.p[1] + sy * off;
      candidates.push({ box: { x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h }, base: fi * 6 + (side === 1 ? 0 : 3) + push / 3 });
    }
  });
  return { key: `edge:${index}`, text, px, candidates, ownEdge: index, note: false };
}

function noteRequest(scene: Scene, key: string, text: string, target: Box): Request {
  const px = scene.fontPx * 0.86;
  const wrapped = wrapText(text);
  const m = measure(wrapped, px, scene.family, scene.weight);
  const nb = target;
  const gap = 34;
  const spots: [number, number][] = [
    [nb.x + nb.w + gap, nb.y - m.h * 0.6],
    [nb.x + nb.w * 0.55, nb.y - m.h - gap],
    [nb.x + nb.w / 2 - m.w / 2, nb.y + nb.h + gap],
    [nb.x + nb.w + gap, nb.y + nb.h * 0.6],
    [nb.x + nb.w / 2 - m.w / 2, nb.y - m.h - gap],
    [nb.x - gap - m.w, nb.y - m.h * 0.4],
    [nb.x - m.w * 0.6, nb.y + nb.h + gap],
    [nb.x - gap - m.w, nb.y + nb.h * 0.5],
    [nb.x + nb.w + gap * 2, nb.y + nb.h / 2 - m.h / 2],
    [nb.x + nb.w / 2 - m.w / 2, nb.y + nb.h + gap * 2],
    [nb.x + nb.w * 0.55, nb.y - m.h - gap * 2],
    [nb.x + nb.w / 2 - m.w / 2, nb.y - m.h - gap * 2],
  ];
  return {
    key,
    text: wrapped,
    px,
    candidates: spots.map(([x, y], k) => ({ box: { x, y, w: m.w, h: m.h }, base: k * 30 })),
    note: true,
  };
}

export function placeLabels(scene: Scene, doc: Doc) {
  // Fixed things labels must avoid.
  const fixed: Box[] = [...scene.nodes.values()].map((n) => nodeBox(n, 4));
  for (const g of scene.groups) fixed.push(g.tab);
  if (scene.titleBox) fixed.push(scene.titleBox);
  doc.annotations.forEach((a) => {
    if (a.kind !== 'circle') return;
    const t = markTarget(scene, a);
    if (t) fixed.push(nodeBox(t, 18));
  });
  const samples: { p: Pt; edge: number }[] = [];
  for (const e of scene.edges) {
    const len = length(e.points);
    for (let d = 0; d < len; d += 10) samples.push({ p: along(e.points, d).p, edge: e.index });
  }

  // Group frames are lines too: labels should not sit on them.
  for (const g of scene.groups) {
    const { x, y, w, h } = g.box;
    const corners: Pt[] = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ];
    const len = length(corners);
    for (let d = 0; d < len; d += 10) samples.push({ p: along(corners, d).p, edge: -1 });
  }

  const placed = new Map<string, Box>();
  const cost = (r: Request, c: Candidate, ignore?: string): number => {
    const pad = r.note ? 6 : 3;
    const box = { x: c.box.x - pad, y: c.box.y - pad, w: c.box.w + pad * 2, h: c.box.h + pad * 2 };
    let s = c.base;
    for (const o of fixed) s += overlapArea(box, o) * 4;
    for (const [k, o] of placed) if (k !== ignore) s += overlapArea(box, o) * 6;
    for (const { p, edge } of samples) {
      if (p[0] > box.x && p[0] < box.x + box.w && p[1] > box.y && p[1] < box.y + box.h) s += edge === r.ownEdge ? 40 : r.note ? 400 : 120;
    }
    if (box.x < 4 || box.y < 4) s += 500;
    // Nothing in the title's row, directly above or below it.
    const t = scene.titleBox;
    if (t && box.y < t.y + t.h && box.x < t.x + t.w && box.x + box.w > t.x) s += 2000;
    return s;
  };
  const best = (r: Request, ignore?: string) => {
    let pick = r.candidates[0];
    let pickCost = Infinity;
    for (const c of r.candidates) {
      const v = cost(r, c, ignore);
      if (v < pickCost) {
        pickCost = v;
        pick = c;
      }
    }
    return pick;
  };
  const run = (requests: Request[]) => {
    // Most constrained first: fewest spots that are free before anything else is placed.
    const freeCount = (r: Request) => r.candidates.filter((c) => cost(r, c) - c.base < 1).length;
    const ordered = [...requests].sort((a, b) => freeCount(a) - freeCount(b));
    for (const r of ordered) placed.set(r.key, best(r).box);
    for (const r of ordered) placed.set(r.key, best(r, r.key).box);
    for (const r of requests) scene.labels.set(r.key, { key: r.key, text: r.text, px: r.px, box: placed.get(r.key)! } satisfies PlacedLabel);
  };

  // Arrow labels first: notes can point at them.
  run(scene.edges.filter((e) => e.def.label).map((e) => edgeLabelRequest(scene, e.index, e.def.label!)));
  const notes: Request[] = [];
  doc.annotations.forEach((a, i) => {
    if (a.kind !== 'note' || !a.text) return;
    const t = markTarget(scene, a);
    if (t) notes.push(noteRequest(scene, `note:${i}`, a.text, nodeBox(t, 4)));
  });
  run(notes);
}
