import type { Box, SceneNode } from '../scene';

/* ── Geometry helpers ────────────────────────────────────────────────────── */

export type Pt = [number, number];

export function polyLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** The point and direction at distance `d` along a polyline. */
export function along(pts: Pt[], d: number): { p: Pt; dir: Pt } {
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

export function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function nodeBox(n: SceneNode, pad = 0): Box {
  return { x: n.cx - n.w / 2 - pad, y: n.cy - n.h / 2 - pad, w: n.w + pad * 2, h: n.h + pad * 2 };
}

export function labelBox(n: SceneNode): Box {
  return { x: n.cx - n.labelW / 2, y: n.cy + n.labelDy - n.labelH / 2, w: n.labelW, h: n.labelH };
}

export function wrap(text: string, max = 24): string {
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

