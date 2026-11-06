import { METRICS, type FaceMetrics } from './metrics.generated';

/**
 * Text measuring from pre-computed font metrics, so layout does not depend on
 * a canvas, on fonts having loaded, or on which browser runs it.
 */

interface Face {
  widths: Map<string, number>;
  fallback: number;
}

const faces = new Map<string, Face>();

function face(family: string, weight: number): Face | null {
  const key = `${family}|${weight}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const byWeight = METRICS[family];
  if (!byWeight) return null;
  const weights = Object.keys(byWeight).map(Number);
  const nearest = weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
  const m: FaceMetrics = byWeight[nearest];
  const widths = new Map<string, number>();
  Array.from(m.chars).forEach((ch, i) => widths.set(ch, m.widths[i]));
  const lower = 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => widths.get(c) ?? 50);
  const f = { widths, fallback: lower.reduce((a, b) => a + b, 0) / lower.length };
  faces.set(key, f);
  return f;
}

let canvasCtx: CanvasRenderingContext2D | null | undefined;
function canvas(): CanvasRenderingContext2D | null {
  if (canvasCtx === undefined) {
    try {
      canvasCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    } catch {
      canvasCtx = null;
    }
  }
  return canvasCtx ?? null;
}

/** Width of one line of text in pixels. */
export function lineWidth(line: string, px: number, family: string, weight: number): number {
  const f = face(family, weight);
  if (!f) {
    const ctx = canvas();
    if (ctx) {
      ctx.font = `${weight} ${px}px '${family}', cursive`;
      return ctx.measureText(line).width;
    }
    return line.length * px * 0.5;
  }
  let w = 0;
  for (const ch of line) {
    const known = f.widths.get(ch);
    if (known !== undefined) w += known;
    else {
      // Characters outside the table (CJK, emoji): measure them if we can.
      const ctx = canvas();
      if (ctx) {
        ctx.font = `${weight} 100px '${family}', cursive`;
        w += ctx.measureText(ch).width || f.fallback;
      } else w += /[⺀-￿]/.test(ch) ? 100 : f.fallback;
    }
  }
  return (w * px) / 100;
}

/** Size of a (possibly multi-line) label, with room for the per-letter wobble. */
export function measure(text: string, px: number, family: string, weight: number): { w: number; h: number } {
  const lines = text.split('\n');
  let w = 0;
  for (const l of lines) w = Math.max(w, lineWidth(l, px, family, weight));
  return { w: w * 1.04 + 2, h: lines.length * px * 1.12 };
}
