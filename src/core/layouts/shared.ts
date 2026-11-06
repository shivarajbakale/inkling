import { measure } from '../measure';
import { HANDS, SIZES } from '../styles';
import type { Doc, NodeDef } from '../types';

export const BASE_SIZE = 19;

export interface Sized {
  w: number;
  h: number;
  labelDy: number;
  lw: number;
  lh: number;
}

/** Text style shared by every layout. */
export function textMetrics(doc: Doc) {
  const hand = HANDS[doc.hand];
  return { px: BASE_SIZE * hand.scale, family: hand.family, weight: hand.weight };
}

export function shapeSize(def: NodeDef, lw: number, lh: number): { w: number; h: number; labelDy: number } {
  switch (def.shape) {
    case 'circle': {
      const w = Math.max(lw * 1.35 + 26, lh * 1.4 + 30, 72);
      const h = Math.max(lh * 1.5 + 26, w * 0.62);
      return { w, h, labelDy: 0 };
    }
    case 'diamond':
      return { w: lw * 1.6 + 40, h: Math.max(lh * 2 + 34, 70), labelDy: 0 };
    case 'cloud':
      return { w: lw * 1.3 + 64, h: lh + 66, labelDy: 2 };
    case 'db':
      return { w: Math.max(lw + 44, 80), h: lh + 62, labelDy: 8 };
    case 'sticky':
      return { w: Math.max(lw + 34, 116), h: Math.max(lh + 36, 96), labelDy: 0 };
    case 'icon': {
      const fig = 44;
      return { w: Math.max(lw + 8, 54), h: fig + lh + 6, labelDy: fig / 2 + 4 };
    }
    case 'person': {
      const fig = 66;
      return { w: Math.max(lw + 8, 54), h: fig + lh + 4, labelDy: fig / 2 + 4 };
    }
    case 'text':
      return { w: lw + 10, h: lh + 8, labelDy: 0 };
    case 'round':
      return { w: lw + 48, h: lh + 28, labelDy: 0 };
    default:
      return { w: lw + 40, h: lh + 28, labelDy: 0 };
  }
}


/** Measures every node's label and works out its box. */
export function sizeNodes(doc: Doc): Map<string, Sized> {
  const { px, family, weight } = textMetrics(doc);
  const out = new Map<string, Sized>();
  for (const def of doc.nodes) {
    const k = SIZES[def.size ?? 'normal'] ?? 1;
    const { w: lw, h: lh } = measure(def.label, px * k, family, weight);
    // Size the shape at normal size, then scale it, so padding grows with the text.
    const s = shapeSize(def, lw / k, lh / k);
    out.set(def.id, { lw, lh, w: s.w * k, h: s.h * k, labelDy: s.labelDy * k });
  }
  return out;
}

export function titleHeight(doc: Doc): number {
  return doc.title ? textMetrics(doc).px * 1.7 + 30 : 0;
}
