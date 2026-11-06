import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { RoughSVG } from 'roughjs/bin/svg';
import { boundaryPoint, measure, type Box, type Layout, type LaidNode } from './layout';
import { hash, rng } from './rng';
import { COLORS, FONT_CSS_URL, PAPERS, PENS, STICKY } from './styles';
import type { AnnotationDef, Doc } from './types';

const NS = 'http://www.w3.org/2000/svg';
let uidCounter = 0;

type Attrs = Record<string, string | number>;
function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}

/* ── Timeline pieces ─────────────────────────────────────────────────────── */

export interface Piece {
  el: SVGElement;
  mode: 'stroke' | 'fade' | 'clip';
  len: number;
  clip?: SVGRectElement;
  clipX?: number;
  clipW?: number;
}

export interface Item {
  step: number;
  rank: number;
  pieces: Piece[];
  dur: number;
  start: number;
}

export interface StepInfo {
  index: number;
  caption?: string;
  start: number;
  end: number;
}

export interface Drawing {
  svg: SVGSVGElement;
  items: Item[];
  steps: StepInfo[];
  duration: number;
}

/** Collects every drawn path in a group as pieces, outlines before fills. */
function piecesFrom(g: Element, ink: string, fadeAll = false): Piece[] {
  const paths = Array.from(g.querySelectorAll('path'));
  const outline: Piece[] = [];
  const rest: Piece[] = [];
  for (const p of paths) {
    const stroke = p.getAttribute('stroke');
    const fill = p.getAttribute('fill');
    const isStroke = stroke && stroke !== 'none' && (!fill || fill === 'none');
    const piece: Piece = { el: p, mode: isStroke && !fadeAll ? 'stroke' : 'fade', len: 0 };
    if (stroke === ink) outline.push(piece);
    else rest.push(piece);
  }
  return [...outline, ...rest];
}

/* ── Handwritten text ────────────────────────────────────────────────────── */

interface TextStyle {
  px: number;
  family: string;
  weight: number;
  color: string;
  mess: number;
}

/**
 * Writes text with a little life in every letter: each glyph gets its own
 * tilt and baseline nudge, so repeated letters never look stamped.
 */
function handText(
  parent: Element,
  text: string,
  cx: number,
  cy: number,
  st: TextStyle,
  rand: () => number,
  defs: SVGDefsElement,
  uid: string,
  anchor: 'middle' | 'start' = 'middle',
): Piece[] {
  const lines = text.split('\n');
  const lh = st.px * 1.12;
  const top = cy - (lines.length * lh) / 2 + lh / 2;
  const pieces: Piece[] = [];
  const wobble = 0.35 + st.mess;
  lines.forEach((line, li) => {
    const y = top + li * lh;
    const chars = Array.from(line);
    const rot: string[] = [];
    const dy: string[] = [];
    let prev = 0;
    for (const _ of chars) {
      const off = (rand() - 0.5) * 2.4 * wobble;
      rot.push(((rand() - 0.5) * 9 * wobble).toFixed(1));
      dy.push((off - prev).toFixed(2));
      prev = off;
    }
    // Lines slope a touch, as a hand moving across paper does.
    const slope = (rand() - 0.5) * 2.2 * wobble;
    const g = el('g', { transform: `rotate(${slope.toFixed(2)} ${cx} ${y})` }, parent);
    const t = el(
      'text',
      {
        x: cx,
        y,
        'font-family': `'${st.family}', cursive`,
        'font-size': st.px,
        'font-weight': st.weight,
        fill: st.color,
        'text-anchor': anchor,
        'dominant-baseline': 'central',
        rotate: rot.join(' '),
        dy: dy.join(' '),
      },
      g,
    );
    t.textContent = line;
    const { w } = measure(line, st.px, st.family, st.weight);
    const x0 = anchor === 'middle' ? cx - w / 2 - 4 : cx - 4;
    const clipId = `${uid}-c${pieces.length}-${Math.round(rand() * 1e6)}`;
    const cp = el('clipPath', { id: clipId }, defs);
    const r = el('rect', { x: x0, y: y - lh, width: 0, height: lh * 2 }, cp);
    g.setAttribute('clip-path', `url(#${clipId})`);
    pieces.push({ el: g, mode: 'clip', len: w, clip: r, clipX: x0, clipW: w + 10 });
  });
  return pieces;
}

/* ── Paper ───────────────────────────────────────────────────────────────── */

function drawPaper(svg: SVGSVGElement, defs: SVGDefsElement, paper: string, vb: Box, uid: string) {
  const p = PAPERS[paper];
  el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: p.ground }, svg);
  const pat = (id: string, w: number, h: number) =>
    el('pattern', { id: `${uid}-${id}`, width: w, height: h, patternUnits: 'userSpaceOnUse', x: vb.x, y: vb.y }, defs);
  const noise = (opacity: number, color: string) => {
    const f = el('filter', { id: `${uid}-noise`, x: 0, y: 0, width: '100%', height: '100%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 2, stitchTiles: 'stitch', result: 'n' }, f);
    el('feColorMatrix', { type: 'matrix', values: `0 0 0 0 ${color} 0 0 0 0 ${color} 0 0 0 0 ${color} 0 0 0 ${opacity} 0` }, f);
    el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, filter: `url(#${uid}-noise)` }, svg);
  };
  switch (paper) {
    case 'notebook': {
      const pt = pat('lines', 8, 30);
      el('line', { x1: 0, y1: 29.5, x2: 8, y2: 29.5, stroke: '#c7d6ec', 'stroke-width': 1 }, pt);
      el('rect', { x: vb.x, y: vb.y + 50, width: vb.w, height: vb.h - 50, fill: `url(#${uid}-lines)` }, svg);
      el('line', { x1: vb.x + 18, y1: vb.y, x2: vb.x + 18, y2: vb.y + vb.h, stroke: '#eeb0ad', 'stroke-width': 1.2 }, svg);
      break;
    }
    case 'graph':
    case 'blueprint': {
      const minor = paper === 'graph' ? '#e2ebf1' : 'rgba(255,255,255,0.10)';
      const major = paper === 'graph' ? '#cbdbe6' : 'rgba(255,255,255,0.22)';
      const pt = pat('grid', 100, 100);
      for (let i = 0; i <= 100; i += 20) {
        const c = i % 100 === 0 ? major : minor;
        el('line', { x1: i, y1: 0, x2: i, y2: 100, stroke: c, 'stroke-width': 1 }, pt);
        el('line', { x1: 0, y1: i, x2: 100, y2: i, stroke: c, 'stroke-width': 1 }, pt);
      }
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-grid)` }, svg);
      if (paper === 'blueprint') noise(0.05, '1');
      break;
    }
    case 'napkin': {
      noise(0.07, '0.35');
      const pt = pat('emboss', 16, 16);
      el('circle', { cx: 8, cy: 8, r: 1.1, fill: 'rgba(120,96,60,0.10)' }, pt);
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-emboss)` }, svg);
      break;
    }
    case 'chalkboard':
      noise(0.07, '1');
      break;
    case 'whiteboard': {
      const lg = el('linearGradient', { id: `${uid}-sheen`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0 }, lg);
      el('stop', { offset: 0.5, 'stop-color': '#e9eef3', 'stop-opacity': 0.5 }, lg);
      el('stop', { offset: 1, 'stop-color': '#ffffff', 'stop-opacity': 0 }, lg);
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-sheen)` }, svg);
      break;
    }
  }
}

/* ── Geometry helpers ────────────────────────────────────────────────────── */

type Pt = [number, number];

function polyLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** The point and direction at distance `d` along a polyline. */
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

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function nodeBox(n: LaidNode, pad = 0): Box {
  return { x: n.cx - n.w / 2 - pad, y: n.cy - n.h / 2 - pad, w: n.w + pad * 2, h: n.h + pad * 2 };
}

function labelBox(n: LaidNode): Box {
  return { x: n.cx - n.labelW / 2, y: n.cy + n.labelDy - n.labelH / 2, w: n.labelW, h: n.labelH };
}

function wrap(text: string, max = 24): string {
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

/* ── The drawing ─────────────────────────────────────────────────────────── */

export function draw(doc: Doc, lay: Layout): Drawing {
  const uid = `ink${++uidCounter}`;
  const paper = PAPERS[doc.paper];
  const pen = PENS[doc.pen];
  const ink = paper.dark ? pen.inkOnDark : pen.ink;
  const mark = paper.dark ? paper.mark : paper.mark;
  const good = paper.dark ? '#8ce6a8' : '#2f8f55';
  const rand = rng(doc.seed * 104729 + 7);

  const svg = el('svg', { xmlns: NS, class: 'inkling-svg', role: 'img' });
  const defs = el('defs', {}, svg);
  const style = el('style', {}, defs);
  style.textContent = `@import url('${FONT_CSS_URL}');`;
  if (doc.title) el('title', {}, svg).textContent = doc.title;

  const rc: RoughSVG = rough.svg(svg);
  const roughness = Math.max(0.25, 0.3 + doc.mess * 1.6 + pen.grain);
  const base = (seedKey: string, extra: Options = {}): Options => ({
    stroke: ink,
    strokeWidth: pen.width,
    roughness,
    bowing: 0.4 + doc.mess * 2,
    seed: (hash(seedKey) + doc.seed * 31) % 2147483646 + 1,
    fillWeight: Math.max(0.8, pen.width * 0.55),
    hachureGap: 5.5,
    hachureAngle: -41,
    ...extra,
  });
  const textStyle: TextStyle = { px: lay.fontPx, family: lay.family, weight: lay.weight, color: ink, mess: doc.mess };

  // The content sits below the title.
  const oy = lay.titleH;
  const shifted = new Map<string, LaidNode>();
  lay.nodes.forEach((n, id) => shifted.set(id, { ...n, cy: n.cy + oy }));

  /* Steps and ordering */
  const stepOf = new Map<string, number>();
  const rankInStep = new Map<string, number>();
  const firstStep = doc.steps.length ? doc.steps[0].index : 1;
  doc.steps.forEach((s) =>
    s.items.forEach((id, k) => {
      if (!stepOf.has(id)) {
        stepOf.set(id, s.index);
        rankInStep.set(id, k);
      }
    }),
  );
  doc.nodes.forEach((n, k) => {
    if (!stepOf.has(n.id)) stepOf.set(n.id, firstStep);
    if (!rankInStep.has(n.id)) rankInStep.set(n.id, 100 + k);
  });

  const items: Item[] = [];
  const add = (step: number, rank: number, pieces: Piece[], dur: number) => items.push({ step, rank, pieces, dur, start: 0 });

  /* Layers */
  const content = el('g', { class: 'content' });
  const edgeLayer = el('g', { class: 'edges' }, content);
  const nodeLayer = el('g', { class: 'nodes' }, content);
  const markLayer = el('g', { class: 'marks' }, content);
  const occupied: Box[] = [];

  /* Title */
  let titleBox: Box | undefined;
  if (doc.title) {
    const g = el('g', { class: 'title' }, content);
    const tp = lay.fontPx * 1.55;
    const { w } = measure(doc.title, tp, lay.family, Math.min(700, lay.weight + 200));
    const cx = lay.width / 2;
    const cy = 22 + tp / 2;
    const pieces = handText(g, doc.title, cx, cy, { ...textStyle, px: tp, weight: Math.min(700, lay.weight + 200) }, rand, defs, uid);
    const y = cy + tp * 0.62;
    const ul = rc.curve(
      [
        [cx - w / 2 - 6, y + 2],
        [cx, y - 1 + (rand() - 0.5) * 3],
        [cx + w / 2 + 10, y - 3],
      ],
      base('title-ul', { stroke: mark, strokeWidth: 2, roughness: 0.6, disableMultiStroke: true }),
    );
    g.appendChild(ul);
    titleBox = { x: cx - w / 2 - 10, y: cy - tp / 2 - 4, w: w + 24, h: tp + 14 };
    occupied.push(titleBox);
    add(-1, 0, [...pieces, ...piecesFrom(ul, mark)], 0.9);
  }

  /* Nodes */
  for (const def of doc.nodes) {
    const n = shifted.get(def.id)!;
    occupied.push(nodeBox(n, 4));
    const g = el('g', { transform: `translate(${n.cx.toFixed(1)} ${n.cy.toFixed(1)}) rotate(${n.rotate.toFixed(2)})` }, nodeLayer);
    const x = -n.w / 2;
    const y = -n.h / 2;
    const fillColor = def.fill ? COLORS[def.fill] : undefined;
    const o = base(`n-${def.id}`, fillColor ? { fill: fillColor, fillStyle: 'hachure', hachureGap: 7.5 } : {});
    let shape: SVGGElement | null = null;
    let labelColor = ink;
    switch (def.shape) {
      case 'box':
        shape = rc.rectangle(x, y, n.w, n.h, o);
        break;
      case 'round': {
        const r = Math.min(n.h / 2, 22);
        const d = `M ${x + r} ${y} L ${x + n.w - r} ${y} Q ${x + n.w} ${y} ${x + n.w} ${y + r} L ${x + n.w} ${y + n.h - r} Q ${x + n.w} ${y + n.h} ${x + n.w - r} ${y + n.h} L ${x + r} ${y + n.h} Q ${x} ${y + n.h} ${x} ${y + n.h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
        shape = rc.path(d, o);
        break;
      }
      case 'circle':
        shape = rc.ellipse(0, 0, n.w, n.h, o);
        break;
      case 'diamond':
        shape = rc.polygon(
          [
            [0, y],
            [n.w / 2, 0],
            [0, -y],
            [-n.w / 2, 0],
          ],
          o,
        );
        break;
      case 'cloud': {
        const bumps = 9;
        const rx = n.w / 2 - 6;
        const ry = n.h / 2 - 6;
        const a0 = rand() * Math.PI;
        let d = '';
        for (let i = 0; i <= bumps; i++) {
          const a = a0 + (i / bumps) * Math.PI * 2;
          const px = Math.cos(a) * rx;
          const py = Math.sin(a) * ry;
          if (i === 0) d += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
          else {
            const rr = ((2 * Math.PI) / bumps) * Math.max(rx, ry) * (0.42 + rand() * 0.12);
            d += ` A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`;
          }
        }
        shape = rc.path(d, o);
        break;
      }
      case 'db': {
        const ry = 10;
        const gg = el('g', {});
        gg.appendChild(rc.ellipse(0, y + ry, n.w, ry * 2, o));
        gg.appendChild(
          rc.path(
            `M ${x} ${y + ry} L ${x} ${y + n.h - ry} A ${n.w / 2} ${ry} 0 0 0 ${x + n.w} ${y + n.h - ry} L ${x + n.w} ${y + ry}`,
            base(`n-${def.id}-b`, fillColor ? { fill: fillColor, fillStyle: 'hachure' } : {}),
          ),
        );
        shape = gg;
        break;
      }
      case 'sticky': {
        const fold = 16;
        const gg = el('g', {});
        el('rect', { x: x + 4, y: y + 5, width: n.w, height: n.h, fill: 'rgba(0,0,0,0.12)', rx: 2 }, gg);
        gg.appendChild(
          rc.polygon(
            [
              [x, y],
              [x + n.w, y],
              [x + n.w, y + n.h - fold],
              [x + n.w - fold, y + n.h],
              [x, y + n.h],
            ],
            base(`n-${def.id}`, { fill: fillColor ?? STICKY, fillStyle: 'solid', stroke: '#c9b44a', strokeWidth: 1, roughness: 0.6 }),
          ),
        );
        gg.appendChild(
          rc.linearPath(
            [
              [x + n.w, y + n.h - fold],
              [x + n.w - fold + 2, y + n.h - fold + 2],
              [x + n.w - fold, y + n.h],
            ],
            base(`n-${def.id}-f`, { stroke: '#b9a33c', strokeWidth: 1, roughness: 0.5 }),
          ),
        );
        shape = gg;
        labelColor = '#2b2a26';
        break;
      }
      case 'person': {
        const gg = el('g', {});
        const top = y;
        const hr = 11;
        gg.appendChild(rc.circle(0, top + hr + 1, hr * 2, o));
        gg.appendChild(rc.line(0, top + hr * 2 + 1, 0, top + 44, o));
        gg.appendChild(rc.line(-16, top + 30, 16, top + 28, o));
        gg.appendChild(rc.line(0, top + 44, -13, top + 64, o));
        gg.appendChild(rc.line(0, top + 44, 13, top + 64, o));
        shape = gg;
        break;
      }
      case 'text':
        break;
    }
    const pieces: Piece[] = [];
    if (shape && fillColor && def.shape !== 'sticky') {
      // Hatching is a pencil fill, so keep it lighter than the outline and the label.
      shape.querySelectorAll('path').forEach((p) => {
        if (p.getAttribute('stroke') === fillColor) p.setAttribute('stroke-opacity', paper.dark ? '0.5' : '0.65');
      });
    }
    if (shape) {
      g.appendChild(shape);
      pieces.push(...piecesFrom(shape, def.shape === 'sticky' ? '#__none' : ink, def.shape === 'sticky'));
    }
    pieces.push(...handText(g, def.label, 0, n.labelDy, { ...textStyle, color: labelColor }, rand, defs, uid));
    const chars = def.label.length;
    add(stepOf.get(def.id)!, rankInStep.get(def.id)!, pieces, 0.5 + Math.min(0.6, chars * 0.025));
  }

  /* Edges */
  const edgeSamples: Pt[] = [];
  doc.edges.forEach((e, i) => {
    const le = lay.edges[i];
    const pts: Pt[] = le.points.map(([x, y]) => [x, y + oy]);
    const g = el('g', {}, edgeLayer);
    const pieces: Piece[] = [];
    const len = polyLength(pts);
    for (let d = 0; d < len; d += 12) edgeSamples.push(along(pts, d).p);

    const drawn: Pt[] = pts;

    const opts = base(`e-${i}`, { disableMultiStroke: doc.mess < 0.3, roughness: roughness * 0.7 });
    if (e.kind === 'squiggle') {
      const out: Pt[] = [];
      const L = polyLength(drawn);
      const ph = rand() * Math.PI * 2;
      for (let d = 0; d <= L; d += 2.5) {
        const { p, dir } = along(drawn, d);
        const fade = Math.min(1, d / 14, (L - d) / 14);
        const amp = 3.6 * fade * Math.sin((d / 13) * Math.PI * 2 + ph);
        out.push([p[0] - dir[1] * amp, p[1] + dir[0] * amp]);
      }
      const path = el('path', {
        d: 'M ' + out.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L '),
        fill: 'none',
        stroke: ink,
        'stroke-width': pen.width,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: pen.opacity,
      }, g);
      pieces.push({ el: path, mode: 'stroke', len: 0 });
    } else {
      const c = rc.curve(drawn, e.kind === 'dashed' ? { ...opts, strokeLineDash: [8, 7], disableMultiStroke: true } : opts);
      g.appendChild(c);
      pieces.push(...piecesFrom(c, ink, e.kind === 'dashed'));
    }

    const head = (tip: Pt, from: Pt, key: string) => {
      const dx = tip[0] - from[0];
      const dy = tip[1] - from[1];
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l;
      const uy = dy / l;
      const size = 10 + pen.width * 1.6;
      const spread = ((24 + rand() * 9) * Math.PI) / 180;
      const wing = (s: number, k: number): Pt => {
        const a = Math.atan2(-uy, -ux) + s * spread;
        return [tip[0] + Math.cos(a) * size * k, tip[1] + Math.sin(a) * size * k];
      };
      const h = rc.linearPath([wing(1, 0.9 + rand() * 0.25), tip, wing(-1, 1 + rand() * 0.2)], base(key, { roughness: 0.4, disableMultiStroke: true }));
      g.appendChild(h);
      pieces.push(...piecesFrom(h, ink));
    };
    const endFrom = along(drawn, Math.max(0, polyLength(drawn) - 12)).p;
    head(drawn[drawn.length - 1], endFrom, `h-${i}`);
    if (e.both) head(drawn[0], along(drawn, 12).p, `h2-${i}`);

    if (e.label) {
      const { p, dir } = along(pts, len / 2);
      const m = measure(e.label, lay.fontPx * 0.82, lay.family, lay.weight);
      const horizontal = Math.abs(dir[0]) >= Math.abs(dir[1]);
      // Put the label beside the line: on the outside of a fanned pair,
      // otherwise above a flat line or right of a steep one.
      let nx = -dir[1];
      let ny = dir[0];
      const fanned = Math.abs(le.bend) > 10;
      const wantFlip = fanned ? le.bend < 0 : horizontal ? ny > 0 : nx < 0;
      if (wantFlip) {
        nx = -nx;
        ny = -ny;
      }
      // Try the preferred side at the middle first, then the other side, then
      // slide along the line, and keep the spot that collides least.
      let lx = p[0];
      let ly = p[1];
      let bestHit = Infinity;
      for (const f of [0.5, 0.36, 0.64, 0.25, 0.75]) {
        for (const side of [1, -1]) {
          const at = along(pts, len * f);
          let ax = -at.dir[1];
          let ay = at.dir[0];
          if (ax * nx + ay * ny < 0) {
            ax = -ax;
            ay = -ay;
          }
          const sx = ax * side;
          const sy = ay * side;
          const off = Math.abs(sy) >= Math.abs(sx) ? m.h / 2 + 5 : m.w / 2 + 8;
          const cx = at.p[0] + sx * off;
          const cy = at.p[1] + sy * off;
          const box = { x: cx - m.w / 2 - 3, y: cy - m.h / 2 - 2, w: m.w + 6, h: m.h + 4 };
          let hit = 0;
          for (const o of occupied) hit += overlap(box, o);
          hit += (f === 0.5 ? 0 : 6) + (side === 1 ? 0 : 3);
          if (hit < bestHit) {
            bestHit = hit;
            lx = cx;
            ly = cy;
          }
          if (hit <= 0.5) break;
        }
        if (bestHit <= 9) break;
      }
      occupied.push({ x: lx - m.w / 2, y: ly - m.h / 2, w: m.w, h: m.h });
      pieces.push(...handText(g, e.label, lx, ly, { ...textStyle, px: lay.fontPx * 0.82 }, rand, defs, uid));
    }
    const step = Math.max(stepOf.get(e.from)!, stepOf.get(e.to)!);
    add(step, 1000 + i, pieces, 0.35 + Math.min(0.5, len / 900) + (e.label ? 0.25 : 0));
  });

  /* Annotations */
  const extra: Box[] = [];
  doc.annotations.forEach((a: AnnotationDef, i) => {
    const n = shifted.get(a.target)!;
    const g = el('g', {}, markLayer);
    const pieces: Piece[] = [];
    const mo = (key: string, more: Options = {}) =>
      base(key, { stroke: mark, strokeWidth: 2, roughness: 0.55, bowing: 0.6, disableMultiStroke: true, ...more });
    const lb = labelBox(n);
    const color = a.color ? COLORS[a.color] : undefined;

    switch (a.kind) {
      case 'circle': {
        const rx = n.w / 2 + 16;
        const ry = n.h / 2 + 13;
        const a0 = rand() * Math.PI * 2;
        const sweep = Math.PI * 2 + 0.35 + rand() * 0.35;
        const tilt = (rand() - 0.5) * 0.25;
        const pts: Pt[] = [];
        const steps = 44;
        for (let k = 0; k <= steps; k++) {
          const t = a0 + (k / steps) * sweep;
          const s = 1 + 0.06 * Math.sin(t * 1.7 + a0) + (k / steps) * 0.05;
          const ex = Math.cos(t) * rx * s;
          const ey = Math.sin(t) * ry * s;
          pts.push([n.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), n.cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
        }
        const c = rc.curve(pts, mo(`a-${i}`, color ? { stroke: color, strokeWidth: 2.4 } : {}));
        g.appendChild(c);
        pieces.push(...piecesFrom(c, color ?? mark));
        extra.push(nodeBox(n, 18));
        break;
      }
      case 'underline':
      case 'strike': {
        const y = a.kind === 'underline' ? lb.y + lb.h + 3 : lb.y + lb.h / 2 + 1;
        const x0 = lb.x - 5;
        const x1 = lb.x + lb.w + 7;
        const stroke = color ?? mark;
        const c1 = rc.curve(
          [
            [x0, y + 1.5],
            [(x0 + x1) / 2, y + (rand() - 0.5) * 3],
            [x1, y - 2],
          ],
          mo(`u-${i}`, { stroke }),
        );
        g.appendChild(c1);
        pieces.push(...piecesFrom(c1, stroke));
        if (a.kind === 'underline') {
          const c2 = rc.curve(
            [
              [x0 + 8, y + 6],
              [(x0 + x1) / 2, y + 5 + (rand() - 0.5) * 2],
              [x1 - 6, y + 3.5],
            ],
            mo(`u2-${i}`, { stroke, strokeWidth: 1.6 }),
          );
          g.appendChild(c2);
          pieces.push(...piecesFrom(c2, stroke));
        }
        break;
      }
      case 'highlight': {
        const hc = color ?? COLORS.yellow;
        const lines = n.def.label.split('\n').length;
        const lh = lb.h / lines;
        for (let k = 0; k < lines; k++) {
          const y = lb.y + lh * (k + 0.55);
          const x0 = lb.x - 6;
          const x1 = lb.x + lb.w + 6;
          const d = `M ${x0} ${y + (rand() - 0.5) * 2} Q ${(x0 + x1) / 2} ${y + (rand() - 0.5) * 4} ${x1} ${y + (rand() - 0.5) * 3}`;
          const path = el('path', {
            d,
            fill: 'none',
            stroke: hc,
            'stroke-width': lh * 0.95,
            'stroke-linecap': 'round',
            opacity: paper.dark ? 0.42 : 0.6,
            style: paper.dark ? '' : 'mix-blend-mode: multiply',
          }, g);
          pieces.push({ el: path, mode: 'stroke', len: 0 });
          // the highlight sits in the node's frame of reference
          path.setAttribute('transform', `rotate(${n.rotate.toFixed(2)} ${n.cx} ${n.cy})`);
        }
        break;
      }
      case 'cross':
      case 'check': {
        const bx = n.cx + n.w / 2 - 2;
        const by = n.cy - n.h / 2 + 2;
        const stroke = a.kind === 'cross' ? (color ?? mark) : (color ?? good);
        if (a.kind === 'cross') {
          const l1 = rc.line(bx - 10, by - 10, bx + 10, by + 10, mo(`x1-${i}`, { stroke, strokeWidth: 2.6 }));
          const l2 = rc.line(bx + 10, by - 10, bx - 10, by + 10, mo(`x2-${i}`, { stroke, strokeWidth: 2.6 }));
          g.append(l1, l2);
          pieces.push(...piecesFrom(l1, stroke), ...piecesFrom(l2, stroke));
        } else {
          const l = rc.linearPath(
            [
              [bx - 11, by],
              [bx - 3, by + 9],
              [bx + 13, by - 13],
            ],
            mo(`ck-${i}`, { stroke, strokeWidth: 2.8 }),
          );
          g.appendChild(l);
          pieces.push(...piecesFrom(l, stroke));
        }
        break;
      }
      case 'note': {
        const text = wrap(a.text ?? '');
        const np = lay.fontPx * 0.86;
        const m = measure(text, np, lay.family, lay.weight);
        const nb = nodeBox(n, 4);
        const gap = 34;
        const cands: Box[] = [
          { x: nb.x + nb.w + gap, y: nb.y - m.h * 0.6, w: m.w, h: m.h },
          { x: nb.x + nb.w * 0.55, y: nb.y - m.h - gap, w: m.w, h: m.h },
          { x: nb.x + nb.w / 2 - m.w / 2, y: nb.y + nb.h + gap, w: m.w, h: m.h },
          { x: nb.x + nb.w + gap, y: nb.y + nb.h * 0.6, w: m.w, h: m.h },
          { x: nb.x + nb.w / 2 - m.w / 2, y: nb.y - m.h - gap, w: m.w, h: m.h },
          { x: nb.x - gap - m.w, y: nb.y - m.h * 0.4, w: m.w, h: m.h },
          { x: nb.x - m.w * 0.6, y: nb.y + nb.h + gap, w: m.w, h: m.h },
        ];
        let best = cands[0];
        let bestScore = Infinity;
        cands.forEach((c, k) => {
          const pad = { x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 };
          let score = k * 30;
          for (const o of [...occupied, ...extra]) score += overlap(pad, o) * 4;
          for (const p of edgeSamples) if (p[0] > pad.x && p[0] < pad.x + pad.w && p[1] > pad.y && p[1] < pad.y + pad.h) score += 400;
          if (titleBox && overlap(pad, titleBox)) score += 1e5;
          if (c.y < (titleBox ? titleBox.y + titleBox.h : 0) - 4) score += 2000;
          if (score < bestScore) {
            bestScore = score;
            best = c;
          }
        });
        extra.push(best);
        const ncx = best.x + best.w / 2;
        const ncy = best.y + best.h / 2;
        const textPieces = handText(g, text, ncx, ncy, { ...textStyle, px: np, color: mark }, rand, defs, uid);
        // The arrow leaves the note on the side facing the node.
        const sx = Math.max(best.x - 4, Math.min(best.x + best.w + 4, n.cx));
        const sy = Math.max(best.y - 4, Math.min(best.y + best.h + 4, n.cy));
        const start: Pt = [sx === n.cx ? ncx + (n.cx - ncx) * 0.15 : sx, sy === n.cy ? ncy : sy];
        const end = boundaryPoint(n, start[0], start[1], 6) as Pt;
        const mx = (start[0] + end[0]) / 2;
        const my = (start[1] + end[1]) / 2;
        const dl = Math.hypot(end[0] - start[0], end[1] - start[1]);
        const bend = dl * 0.22 * (rand() > 0.5 ? 1 : -1);
        const ctrl: Pt = [mx - ((end[1] - start[1]) / (dl || 1)) * bend, my + ((end[0] - start[0]) / (dl || 1)) * bend];
        const arrow = rc.curve([start, ctrl, end], mo(`na-${i}`, { strokeWidth: 1.6 }));
        g.appendChild(arrow);
        const tipFrom: Pt = [ctrl[0] * 0.3 + end[0] * 0.7, ctrl[1] * 0.3 + end[1] * 0.7];
        const dx = end[0] - tipFrom[0];
        const dy = end[1] - tipFrom[1];
        const ang = Math.atan2(-dy, -dx);
        const s = 9;
        const hd = rc.linearPath(
          [
            [end[0] + Math.cos(ang + 0.5) * s, end[1] + Math.sin(ang + 0.5) * s],
            end,
            [end[0] + Math.cos(ang - 0.5) * s, end[1] + Math.sin(ang - 0.5) * s],
          ],
          mo(`nh-${i}`, { strokeWidth: 1.6, roughness: 0.3 }),
        );
        g.appendChild(hd);
        pieces.push(...textPieces, ...piecesFrom(arrow, mark), ...piecesFrom(hd, mark));
        break;
      }
    }
    const step = a.at ?? stepOf.get(a.target)!;
    add(step, 5000 + i, pieces, a.kind === 'note' ? 0.9 : a.kind === 'highlight' ? 0.45 : 0.55);
  });

  /* Bounds and paper */
  const all: Box[] = [{ x: 0, y: 0, w: lay.width, h: lay.height + oy }, ...extra];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of all) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const vb: Box = { x: minX - 20, y: minY - 16, w: maxX - minX + 40, h: maxY - minY + 32 };
  svg.setAttribute('viewBox', `${vb.x.toFixed(0)} ${vb.y.toFixed(0)} ${vb.w.toFixed(0)} ${vb.h.toFixed(0)}`);
  svg.setAttribute('width', vb.w.toFixed(0));
  svg.setAttribute('height', vb.h.toFixed(0));
  drawPaper(svg, defs, doc.paper, vb, uid);
  if (pen.opacity < 1) content.setAttribute('opacity', String(pen.opacity));
  svg.appendChild(content);

  /* Schedule */
  items.sort((a, b) => a.step - b.step || a.rank - b.rank);
  const stepIndices = Array.from(new Set(items.filter((i) => i.step >= 0).map((i) => i.step))).sort((a, b) => a - b);
  const steps: StepInfo[] = [];
  let t = 0;
  let k = 0;
  if (items.length && items[0].step < 0) {
    items[0].start = 0;
    t = items[0].dur * 0.85;
    k = 1;
  }
  for (const s of stepIndices) {
    const start = t;
    let end = t;
    while (k < items.length && items[k].step === s) {
      items[k].start = t;
      end = Math.max(end, t + items[k].dur);
      t += items[k].dur * 0.78;
      k++;
    }
    t = end + 0.3;
    steps.push({ index: s, caption: doc.steps.find((d) => d.index === s)?.caption, start, end });
  }
  const duration = items.reduce((m, i) => Math.max(m, i.start + i.dur), 0);
  return { svg, items, steps, duration };
}
