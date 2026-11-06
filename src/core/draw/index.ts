import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { describe } from '../describe';
import { hash, rng } from '../rng';
import { decorationBox, type Box, type Scene } from '../scene';
import { FONT_CSS_URL, INKS, PAPERS, PENS } from '../styles';
import type { AnnotationDef, Doc } from '../types';
import type { DrawContext } from './context';
import { el, NS, useDocument } from './dom';
import { drawDecorations } from './decorations';
import { drawEdges } from './edges';
import { drawGroups, memberIds } from './groups';
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
  /** Draw everything at once, with no animation. Used for very large drawings. */
  still?: boolean;
}

let uidCounter = 0;

/** Which step each node belongs to, and its order within that step. */
function assignSteps(doc: Doc, scene: Scene) {
  const stepOf = new Map<string, number>();
  const rankInStep = new Map<string, number>();
  const groupMembers = (id: string): string[] => {
    const g = doc.groups.find((x) => x.id === id);
    if (!g) return [];
    return [...g.members, ...doc.groups.filter((c) => c.parent === id).flatMap((c) => groupMembers(c.id))];
  };
  if (doc.steps.length) {
    doc.steps.forEach((s) =>
      s.items.forEach((id, k) => {
        // A group in a step stands for all of its members.
        for (const nid of doc.groups.some((g) => g.id === id) ? groupMembers(id) : [id]) {
          if (!stepOf.has(nid)) {
            stepOf.set(nid, s.index);
            rankInStep.set(nid, k);
          }
        }
      }),
    );
  } else if (doc.autoSteps && scene.autoSteps?.nodes) {
    // The layout knows the natural order (a cycle's turn, a timeline's dates).
    for (const [id, s] of scene.autoSteps.nodes) {
      stepOf.set(id, s);
      rankInStep.set(id, 0);
    }
  } else if (doc.autoSteps) {
    [...doc.nodes].sort((a, b) => a.order - b.order).forEach((n, k) => {
      stepOf.set(n.id, k + 1);
      rankInStep.set(n.id, 0);
    });
  }
  const firstStep = doc.steps.length ? doc.steps[0].index : 1;
  doc.nodes.forEach((n, k) => {
    if (!stepOf.has(n.id)) stepOf.set(n.id, firstStep);
    if (!rankInStep.has(n.id)) rankInStep.set(n.id, 100 + k);
  });
  return { stepOf, rankInStep };
}

/** Inks a scene: paper, title, groups, nodes, arrows, marks, then the animation schedule. */
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
  el('desc', {}, svg).textContent = describe(doc);

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

  const { stepOf, rankInStep } = assignSteps(doc, lay);
  const autoEdges = !doc.steps.length && doc.autoSteps ? lay.autoSteps?.edges : undefined;
  const autoMarks = !doc.steps.length && doc.autoSteps ? lay.autoSteps?.marks : undefined;
  const edgeStep = (i: number) => {
    const fromLayout = autoEdges?.get(i);
    if (fromLayout !== undefined) return fromLayout;
    const e = doc.edges[i];
    return Math.max(stepOf.get(e.from) ?? 1, stepOf.get(e.to) ?? 1);
  };
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
    inkFor: (name) => (INKS[name] ? INKS[name][paper.dark ? 'dark' : 'light'] : ink),
    stepOf,
    rankInStep,
    edgeStep,
    stepOfTarget: (a: AnnotationDef) => {
      const fromLayout = autoMarks?.get(doc.annotations.indexOf(a));
      if (fromLayout !== undefined) return fromLayout;
      if (a.targetKind === 'edge') return edgeStep(a.edgeIndex ?? 0);
      if (a.targetKind === 'group') {
        const ids = memberIds(ctx, a.target);
        return ids.length ? Math.max(...ids.map((m) => stepOf.get(m) ?? 1)) : 1;
      }
      return stepOf.get(a.target) ?? 1;
    },
    add: (step: number, rank: number, pieces: Piece[], dur: number) => items.push({ step, rank, pieces, dur, start: 0 }),
    content,
    groupLayer: el('g', { class: 'groups' }, content),
    decoLayer: el('g', { class: 'decorations' }, content),
    edgeLayer: el('g', { class: 'edges' }, content),
    nodeLayer: el('g', { class: 'nodes' }, content),
    markLayer: el('g', { class: 'marks' }, content),
    extra: [...lay.labels.values()].map((l) => l.box),
  };

  // Order matters: each pass draws from the same random stream.
  drawTitle(ctx);
  drawGroups(ctx);
  drawDecorations(ctx);
  drawNodes(ctx);
  drawEdges(ctx);
  drawMarks(ctx);

  // Fit the canvas to everything drawn, then lay paper under it.
  const all: Box[] = [
    { x: 0, y: 0, w: lay.width, h: lay.height },
    ...ctx.extra,
    ...lay.decorations.map(decorationBox).filter((b): b is Box => !!b),
  ];
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

  if (opts.still) {
    for (const it of items) {
      it.start = 0;
      it.dur = 0.001;
    }
    return { svg, items, steps: [{ index: 1, start: 0, end: 0.001 }], duration: 0.001 };
  }
  const { steps, duration } = schedule(items, doc);
  return { svg, items, steps, duration };
}
