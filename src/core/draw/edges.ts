import { PENS } from '../styles';
import type { DrawContext } from './context';
import { el } from './dom';
import { along, polyLength, type Pt } from './geometry';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

export function drawEdges(ctx: DrawContext) {
  const { doc, textStyle, lay, defs, rc, rand, base, paper, uid, roughness, add, edgeLayer, inkFor } = ctx;
  doc.edges.forEach((e, i) => {
    const le = lay.edges[i];
    if (!le || le.style === 'hidden' || le.points.length < 2) return;
    const pts: Pt[] = le.points;
    const g = el('g', { 'data-ink-kind': 'edge', 'data-ink-id': `${e.from}->${e.to}`, 'data-ink-index': i, 'data-ink-line': e.span.line, 'data-ink-from': e.span.from, 'data-ink-to': e.span.to }, edgeLayer);
    const pieces: Piece[] = [];
    const len = polyLength(pts);
    const drawn: Pt[] = pts;
    // Per-arrow pen and colour override the drawing's.
    const pen = e.pen ? PENS[e.pen] : ctx.pen;
    const ink = e.color ? inkFor(e.color) : e.pen ? (paper.dark ? pen.inkOnDark : pen.ink) : ctx.ink;

    const opts = base(`e-${i}`, { stroke: ink, strokeWidth: pen.width, disableMultiStroke: doc.mess < 0.3, roughness: roughness * 0.7 });
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
      const h = rc.linearPath([wing(1, 0.9 + rand() * 0.25), tip, wing(-1, 1 + rand() * 0.2)], base(key, { stroke: ink, strokeWidth: pen.width, roughness: 0.4, disableMultiStroke: true }));
      g.appendChild(h);
      pieces.push(...piecesFrom(h, ink));
    };
    const endFrom = along(drawn, Math.max(0, polyLength(drawn) - 12)).p;
    if (le.style !== 'plain') {
      head(drawn[drawn.length - 1], endFrom, `h-${i}`);
      if (e.both) head(drawn[0], along(drawn, 12).p, `h2-${i}`);
    }

    const placed = lay.labels.get(`edge:${i}`);
    if (placed) {
      const cx = placed.box.x + placed.box.w / 2;
      const cy = placed.box.y + placed.box.h / 2;
      pieces.push(...handText(g, placed.text, cx, cy, { ...textStyle, px: placed.px, color: ink }, rand, defs, uid));
    }
    const step = ctx.edgeStep(i);
    add(step, 1000 + i, pieces, 0.35 + Math.min(0.5, len / 900) + (e.label ? 0.25 : 0));
  });
}
