/**
 * The elkjs trial: lays out the big fixtures with dagre (today), ELK layered
 * with orthogonal routes, and ELK layered with splines, then scores each one.
 * Writes SVGs and results.json to ELK_OUT (default: scripts/elk-spike/out).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ELK from 'elkjs/lib/elk.bundled.js';
import { it } from 'vitest';
import { GROUP_PAD } from '../../src/core/arrange';
import { draw } from '../../src/core/draw';
import { segmentHitsBox } from '../../src/core/humanise';
import { layout, LAYOUTS } from '../../src/core/layouts';
import { flow } from '../../src/core/layouts/flow';
import { sizeNodes, textMetrics, titleHeight } from '../../src/core/layouts/shared';
import { measure } from '../../src/core/measure';
import { parse } from '../../src/core/parse';
import type { Pt, Scene, SceneNode } from '../../src/core/scene';
import type { Doc } from '../../src/core/types';

const DIR = resolve(__dirname, '../../tests/fixtures/big');
const OUT = process.env.ELK_OUT ?? resolve(__dirname, 'out');
type Routing = 'ORTHOGONAL' | 'SPLINES';

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  children?: ElkNode[];
  layoutOptions?: Record<string, string>;
}
interface ElkSection {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bendPoints?: { x: number; y: number }[];
}

/** Rounds each corner of an orthogonal route with two extra points, so the pen's curve hugs it. */
function soften(pts: Pt[], r = 12): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const toward = (p: Pt, q: Pt, d: number): Pt => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const k = Math.min(d, l / 2) / l;
      return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    };
    out.push(toward(b, a, r), toward(b, c, r));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

async function elkFlow(doc: Doc, routing: Routing): Promise<{ scene: Scene; ms: number }> {
  const { px, family, weight } = textMetrics(doc);
  const sized = sizeNodes(doc);
  const down = doc.direction === 'down';
  const labelSizes = doc.edges.map((e) => (e.label ? measure(e.label, px * 0.82, family, weight) : null));
  const widest = Math.max(0, ...labelSizes.map((l) => (l ? l.w : 0)));
  const tabH = measure('Hg', px * 0.8, family, Math.min(700, weight + 200)).h + 6;
  const byId = new Map<string, ElkNode>();
  const root: ElkNode = {
    id: '__root',
    children: [],
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': down ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': routing,
      'elk.spacing.nodeNode': String(down ? 56 : 40),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(down ? 62 : Math.min(240, Math.max(78, widest + 40))),
      'elk.spacing.edgeNode': '24',
      'elk.spacing.edgeEdge': '16',
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.json.edgeCoords': 'ROOT',
      'elk.json.shapeCoords': 'ROOT',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.padding': '[top=36,left=36,bottom=36,right=36]',
    },
  };
  for (const g of doc.groups)
    byId.set(g.id, { id: g.id, children: [], layoutOptions: { 'elk.padding': `[top=${GROUP_PAD + tabH + 2},left=${GROUP_PAD},bottom=${GROUP_PAD},right=${GROUP_PAD}]` } });
  for (const d of doc.nodes) {
    const s = sized.get(d.id)!;
    byId.set(d.id, { id: d.id, width: s.w, height: s.h });
  }
  for (const g of doc.groups) (g.parent ? byId.get(g.parent)! : root).children!.push(byId.get(g.id)!);
  for (const d of doc.nodes) (d.group ? byId.get(d.group)! : root).children!.push(byId.get(d.id)!);
  const graph = {
    ...root,
    edges: doc.edges.map((e, i) => ({
      id: `e${i}`,
      sources: [e.from],
      targets: [e.to],
      labels: labelSizes[i] ? [{ text: e.label, width: labelSizes[i]!.w + 8, height: labelSizes[i]!.h + 4 }] : [],
    })),
  };
  const elk = new ELK();
  const t0 = performance.now();
  const out = (await elk.layout(graph as never)) as unknown as ElkNode & { edges: { id: string; sections?: ElkSection[] }[] };
  const ms = performance.now() - t0;

  const pos = new Map<string, ElkNode>();
  const walk = (n: ElkNode) => {
    pos.set(n.id, n);
    n.children?.forEach(walk);
  };
  walk(out);
  const nodes = new Map<string, SceneNode>();
  for (const def of doc.nodes) {
    const p = pos.get(def.id)!;
    const s = sized.get(def.id)!;
    nodes.set(def.id, { def, cx: p.x! + s.w / 2, cy: p.y! + s.h / 2, w: s.w, h: s.h, rotate: 0, labelDy: s.labelDy, labelW: s.lw, labelH: s.lh });
  }
  const edges = doc.edges.map((def, index) => {
    const sec = out.edges.find((x) => x.id === `e${index}`)?.sections?.[0];
    let route: Pt[] = [];
    if (sec) {
      const pts: Pt[] = [[sec.startPoint.x, sec.startPoint.y], ...(sec.bendPoints ?? []).map((b) => [b.x, b.y] as Pt), [sec.endPoint.x, sec.endPoint.y]];
      route = routing === 'ORTHOGONAL' ? soften(pts) : pts;
      // A straight run end to end is a direct line; let the router bow it like dagre's.
      if (pts.length === 2) route = [];
    }
    return { index, def, route, points: [] as Pt[], bend: 0 };
  });
  const scene: Scene = {
    layout: 'flow',
    decorations: [],
    groups: [],
    labels: new Map(),
    titleH: titleHeight(doc),
    fontPx: px,
    family,
    weight,
    humanise: { tilt: 3.2, stickyTilt: 7, jitterX: 16, jitterY: 12 },
    nodes,
    edges,
    width: out.width ?? 200,
    height: out.height ?? 120,
    warnings: [],
  } as Scene;
  return { scene, ms };
}

/** Runs the normal pipeline with the given placement in place of flow. */
function finish(doc: Doc, placed: Scene): Scene {
  const keep = LAYOUTS.flow;
  LAYOUTS.flow = () => placed;
  try {
    return layout(doc);
  } finally {
    LAYOUTS.flow = keep;
  }
}

function segs(pts: Pt[]): [Pt, Pt][] {
  return pts.slice(1).map((p, i) => [pts[i], p]);
}
function cross(p: Pt, q: Pt, r: Pt, s: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(r, s, p);
  const d2 = d(r, s, q);
  const d3 = d(p, q, r);
  const d4 = d(p, q, s);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Crossings, arrows through boxes, bends, area. */
function score(scene: Scene) {
  const live = scene.edges.filter((e) => e.style !== 'hidden' && e.points.length >= 2);
  let crossings = 0;
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i].def;
      const b = live[j].def;
      if (a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to) continue;
      for (const [p, q] of segs(live[i].points)) for (const [r, s] of segs(live[j].points)) if (cross(p, q, r, s)) crossings++;
    }
  let through = 0;
  for (const e of live)
    for (const n of scene.nodes.values()) {
      if (n.def.id === e.def.from || n.def.id === e.def.to) continue;
      const box = { x: n.cx - n.w / 2 + 3, y: n.cy - n.h / 2 + 3, w: n.w - 6, h: n.h - 6 };
      if (segs(e.points).some(([p, q]) => segmentHitsBox(p, q, box))) through++;
    }
  // Bends: total turning along each drawn line, in right angles, so rounded corners count once.
  let turn = 0;
  let length = 0;
  for (const e of live) {
    const pts = e.points;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      const b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let t = Math.abs(b - a);
      if (t > Math.PI) t = 2 * Math.PI - t;
      turn += t;
    }
  }
  const bends = Math.round(turn / (Math.PI / 2));
  let labelHits = 0;
  for (const l of scene.labels.values())
    for (const n of scene.nodes.values()) {
      const b = { x: n.cx - n.w / 2, y: n.cy - n.h / 2, w: n.w, h: n.h };
      const ox = Math.min(l.box.x + l.box.w, b.x + b.w) - Math.max(l.box.x, b.x);
      const oy = Math.min(l.box.y + l.box.h, b.y + b.h) - Math.max(l.box.y, b.y);
      if (ox > 2 && oy > 2) labelHits++;
    }
  return { crossings, through, bends, length: Math.round(length), labelHits, area: Math.round((scene.width * scene.height) / 1000), w: Math.round(scene.width), h: Math.round(scene.height) };
}

function svg(doc: Doc, scene: Scene): string {
  const d = draw(doc, scene, { idPrefix: 'x', still: true });
  return new XMLSerializer().serializeToString(d.svg);
}

it('elk trial', async () => {
  mkdirSync(OUT, { recursive: true });
  const rows: Record<string, unknown>[] = [];
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.inkling')).sort()) {
    const src = readFileSync(resolve(DIR, f), 'utf8');
    const name = f.replace('.inkling', '');
    const doc = () => parse(src);
    const t0 = performance.now();
    const d0 = doc();
    const dag = finish(d0, flow(d0));
    const dagMs = performance.now() - t0;
    writeFileSync(resolve(OUT, `${name}.dagre.svg`), svg(d0, dag));
    const row: Record<string, unknown> = { name, nodes: d0.nodes.length, edges: d0.edges.length, groups: d0.groups.length, dagre: { ...score(dag), ms: Math.round(dagMs) } };
    for (const routing of ['ORTHOGONAL', 'SPLINES'] as Routing[]) {
      const d1 = doc();
      // First run warms ELK up; time the second.
      await elkFlow(d1, routing);
      const { scene, ms } = await elkFlow(d1, routing);
      const done = finish(d1, scene);
      const key = routing === 'ORTHOGONAL' ? 'elkOrtho' : 'elkSpline';
      writeFileSync(resolve(OUT, `${name}.${key}.svg`), svg(d1, done));
      row[key] = { ...score(done), ms: Math.round(ms) };
    }
    rows.push(row);
  }
  writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(rows, null, 2));
  const fmt = (s: Record<string, number>) => `x${s.crossings} thru${s.through} b${s.bends} lab${s.labelHits} ${s.w}x${s.h} ${s.ms}ms`;
  for (const r of rows)
    console.log(
      `${String(r.name).padEnd(20)} n${r.nodes} e${r.edges}\n  dagre  ${fmt(r.dagre as never)}\n  ortho  ${fmt(r.elkOrtho as never)}\n  spline ${fmt(r.elkSpline as never)}`,
    );
});
