import { humanise, routeEdges } from '../humanise';
import { rng } from '../rng';
import type { LayoutFn, Scene } from '../scene';
import type { Doc } from '../types';
import { flow } from './flow';

/** Every layout by name. New layouts register here. */
export const LAYOUTS: Record<string, LayoutFn> = { flow };

/** Places, humanises and routes: everything before ink. */
export function layout(doc: Doc): Scene {
  const place = LAYOUTS[doc.layout] ?? flow;
  const scene = place(doc);
  const rand = rng(doc.seed * 7919 + 13);
  humanise(scene, doc, rand);
  routeEdges(scene, doc, rand);
  return scene;
}
