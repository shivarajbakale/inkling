import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { hash, rng } from '../rng';
import type { Box, Scene, SceneNode } from '../scene';
import { FONT_CSS_URL, PAPERS, PENS } from '../styles';
import type { Doc } from '../types';
import type { DrawContext } from './context';
import { el, NS, useDocument } from './dom';
import { drawEdges } from './edges';
import { drawMarks } from './marks';
import { drawNodes } from './nodes';
import { drawPaper } from './paper';
import type { Drawing, Item, Piece } from './pieces';
import { schedule } from './schedule';
import { drawTitle } from './title';

export type { Drawing, Item, Piece, StepInfo } from './pieces';

export interface DrawOptions {
  /** Document to create elements in. Defaults to the global one. */
  document?: Document;
  /** Prefix for ids inside the SVG. Fixed prefixes make output reproducible. */
  idPrefix?: string;
}

let uidCounter = 0;

/** Inks a scene: paper, title, nodes, arrows, marks, then the animation schedule. */
export function draw(doc: Doc, lay: Scene, opts: DrawOptions = {}): Drawing {
  useDocument(opts.document ?? globalThis.document);
  const uid = opts.idPrefix ?? `ink${++uidCounter}`;
  const paper = PAPERS[doc.paper];
  const pen = PENS[doc.pen];
  const ink = paper.dark ? pen.inkOnDark : pen.ink;
  const mark = paper.mark;
  const good = paper.dark ? '#8ce6a8' : '#2f8f55';

  const svg = el('svg', { xmlns: NS, class: 'inkling-svg', role: 'img' });
  const defs = el('defs', {}, svg);
  el('style', {}, defs).textContent = `@import url('${FONT_CSS_URL}');`;
  if (doc.title) el('title', {}, svg).textContent = doc.title;

  const roughness = Math.max(0.25, 0.3 + doc.mess * 1.6 + pen.grain);
  const base = (seedKey: string, extra: Options = {}): Options => ({
    stroke: ink,
    strokeWidth: pen.width,
    roughness,
    bowing: 0.4 + doc.mess * 2,
    seed: ((hash(seedKey) + doc.seed * 31) % 2147483646) + 1,
    fillWeight: Math.max(0.8, pen.width * 0.55),
    hachureGap: 5.5,
    hachureAngle: -41,
    ...extra,
  });

  // The content sits below the title.
  const oy = lay.titleH;
  const shifted = new Map<string, SceneNode>();
  lay.nodes.forEach((n, id) => shifted.set(id, { ...n, cy: n.cy + oy }));

  // Which step each node belongs to, and its order within the step.
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
  const content = el('g', { class: 'content' });
  const ctx: DrawContext = {
    doc,
    lay,
    uid,
    svg,
    defs,
    rc: rough.svg(svg),
    rand: rng(doc.seed * 104729 + 7),
    base,
    roughness,
    textStyle: { px: lay.fontPx, family: lay.family, weight: lay.weight, color: ink, mess: doc.mess },
    paper,
    pen,
    ink,
    mark,
    good,
    oy,
    shifted,
    stepOf,
    rankInStep,
    add: (step: number, rank: number, pieces: Piece[], dur: number) => items.push({ step, rank, pieces, dur, start: 0 }),
    content,
    edgeLayer: el('g', { class: 'edges' }, content),
    nodeLayer: el('g', { class: 'nodes' }, content),
    markLayer: el('g', { class: 'marks' }, content),
    occupied: [],
    extra: [],
    edgeSamples: [],
  };

  // Order matters: each pass draws from the same random stream.
  drawTitle(ctx);
  drawNodes(ctx);
  drawEdges(ctx);
  drawMarks(ctx);

  // Fit the canvas to everything drawn, then lay paper under it.
  const all: Box[] = [{ x: 0, y: 0, w: lay.width, h: lay.height + oy }, ...ctx.extra];
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

  const { steps, duration } = schedule(items, doc);
  return { svg, items, steps, duration };
}
