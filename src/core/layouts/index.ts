import { applyTitle, fitGroups, normalize } from '../arrange';
import { humanise, routeEdges } from '../humanise';
import { placeLabels } from '../labels';
import { rng } from '../rng';
import type { LayoutFn, Scene } from '../scene';
import type { Doc } from '../types';
import { chart } from './chart';
import { compare } from './compare';
import { cycle } from './cycle';
import { flow } from './flow';
import { free } from './free';
import { mindmap } from './mindmap';
import { sequence } from './sequence';
import { stack } from './stack';
import { state } from './state';
import { timeline } from './timeline';
import { tree } from './tree';

/** Every layout by name. New layouts register here. */
export const LAYOUTS: Record<string, LayoutFn> = { flow, free, stack, cycle, timeline, compare, mindmap, sequence, chart, tree, state };

/**
 * Everything before ink: place (the layout), humanise, frame groups, make
 * room for the title, route arrows, then place labels and notes.
 */
export function layout(doc: Doc): Scene {
  const place = LAYOUTS[doc.layout] ?? flow;
  const scene = place(doc);
  const rand = rng(doc.seed * 7919 + 13);
  humanise(scene, doc, rand);
  fitGroups(scene, doc);
  normalize(scene);
  applyTitle(scene, doc);
  routeEdges(scene, doc, rand);
  placeLabels(scene, doc);
  return scene;
}
