import { measure } from '../measure';
import type { DrawContext } from './context';
import { el } from './dom';
import { along, overlap, polyLength, type Pt } from './geometry';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

export function drawEdges(ctx: DrawContext) {
  const { doc, textStyle, lay, defs, rc, rand, base, ink, pen, uid, roughness, oy, stepOf, add, edgeLayer, occupied, edgeSamples } = ctx;
  /* Edges */
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
}
