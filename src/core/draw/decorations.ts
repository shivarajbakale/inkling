import type { Pt } from '../scene';
import type { DrawContext } from './context';
import { el } from './dom';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

/** Extra ink from the layout: lifelines, axes, braces, rules, branches, rings. */
export function drawDecorations(ctx: DrawContext) {
  const { lay, rc, base, rand, defs, uid, textStyle, ink, mark, add, decoLayer, stepOf, edgeStep } = ctx;
  const color = (c?: string) => (!c || c === 'ink' ? ink : c === 'mark' ? mark : ctx.inkFor(c));
  lay.decorations.forEach((d, i) => {
    const g = el('g', { class: `deco deco-${d.kind}` }, decoLayer);
    const pieces: Piece[] = [];
    const key = `d-${i}`;
    switch (d.kind) {
      case 'line': {
        const stroke = color(d.color);
        const o = base(key, { stroke, strokeWidth: d.width ?? ctx.pen.width, roughness: ctx.roughness * 0.5, bowing: 0.3, disableMultiStroke: true, ...(d.dashed ? { strokeLineDash: [6, 6] } : {}) });
        const line = d.smooth || d.points.length > 2 ? rc.curve(d.points, o) : rc.line(d.points[0][0], d.points[0][1], d.points[1][0], d.points[1][1], o);
        g.appendChild(line);
        pieces.push(...piecesFrom(line, stroke, !!d.dashed));
        if (d.arrow) {
          const tip = d.points[d.points.length - 1];
          const from = d.points[d.points.length - 2];
          const a = Math.atan2(from[1] - tip[1], from[0] - tip[0]);
          const s = 11;
          const h = rc.linearPath(
            [
              [tip[0] + Math.cos(a + 0.45) * s, tip[1] + Math.sin(a + 0.45) * s],
              tip,
              [tip[0] + Math.cos(a - 0.45) * s, tip[1] + Math.sin(a - 0.45) * s],
            ],
            base(`${key}-h`, { stroke, roughness: 0.4, disableMultiStroke: true }),
          );
          g.appendChild(h);
          pieces.push(...piecesFrom(h, stroke));
        }
        break;
      }
      case 'brace': {
        // A curly bracket from `from` to `to`, its point toward `toward`.
        const [x1, y1] = d.from;
        const [x2, y2] = d.to;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        let nx = -(y2 - y1) / len;
        let ny = (x2 - x1) / len;
        if ((d.toward[0] - mx) * nx + (d.toward[1] - my) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const depth = Math.min(14, len / 6);
        const P = (t: number, k: number): Pt => [x1 + (x2 - x1) * t + nx * depth * k, y1 + (y2 - y1) * t + ny * depth * k];
        const path = `M ${P(0, 0)} Q ${P(0, 0.5)} ${P(0.08, 0.5)} L ${P(0.42, 0.5)} Q ${P(0.5, 0.5)} ${P(0.5, 1)} Q ${P(0.5, 0.5)} ${P(0.58, 0.5)} L ${P(0.92, 0.5)} Q ${P(1, 0.5)} ${P(1, 0)}`;
        const b = rc.path(path, base(key, { roughness: 0.5, disableMultiStroke: true }));
        g.appendChild(b);
        pieces.push(...piecesFrom(b, ink));
        break;
      }
      case 'text': {
        const weight = d.bold ? Math.min(700, textStyle.weight + 200) : textStyle.weight;
        pieces.push(...handText(g, d.text, d.x, d.y, { ...textStyle, px: d.px, weight, color: color(d.color) }, rand, defs, uid, d.anchor ?? 'middle'));
        break;
      }
      case 'branch': {
        // A tapered stroke: thick at the start, thin at the end, drawn as a filled shape.
        const pts = d.points;
        const left: Pt[] = [];
        const right: Pt[] = [];
        pts.forEach((p, k) => {
          const q = pts[Math.min(k + 1, pts.length - 1)];
          const r = pts[Math.max(k - 1, 0)];
          const dx = q[0] - r[0];
          const dy = q[1] - r[1];
          const l = Math.hypot(dx, dy) || 1;
          const w = (d.w0 + (d.w1 - d.w0) * (k / (pts.length - 1))) / 2;
          const wob = 1 + (rand() - 0.5) * 0.25;
          left.push([p[0] - (dy / l) * w * wob, p[1] + (dx / l) * w * wob]);
          right.push([p[0] + (dy / l) * w * wob, p[1] - (dx / l) * w * wob]);
        });
        const outline = [...left, ...right.reverse()];
        const fill = color(d.color);
        const path = el('path', { d: 'M ' + outline.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ' Z', fill, stroke: 'none' }, g);
        pieces.push({ el: path, mode: 'fade', len: 0 });
        break;
      }
      case 'box': {
        const o = base(key, {
          roughness: ctx.roughness * 0.6,
          disableMultiStroke: true,
          ...(d.dashed ? { strokeLineDash: [6, 5] } : {}),
          ...(d.fill ? { fill: d.fill, fillStyle: 'solid' } : {}),
        });
        const r = rc.rectangle(d.box.x, d.box.y, d.box.w, d.box.h, o);
        g.appendChild(r);
        pieces.push(...piecesFrom(r, ink, !!d.dashed));
        break;
      }
      case 'ring': {
        const stroke = color(d.color);
        const pts: Pt[] = [];
        const a0 = rand() * Math.PI * 2;
        for (let k = 0; k <= 40; k++) {
          const t = a0 + (k / 40) * (Math.PI * 2 + 0.35);
          pts.push([d.cx + Math.cos(t) * d.rx, d.cy + Math.sin(t) * d.ry]);
        }
        const r = rc.curve(pts, base(key, { stroke, strokeWidth: 1.8, roughness: 0.5, disableMultiStroke: true }));
        g.appendChild(r);
        pieces.push(...piecesFrom(r, stroke));
        break;
      }
      case 'zigzag': {
        const [x, y] = d.at;
        const pts: Pt[] = d.vertical
          ? [[x - 10, y - 6], [x + 10, y - 2], [x - 10, y + 2], [x + 10, y + 6]]
          : [[x - 6, y - 10], [x - 2, y + 10], [x + 2, y - 10], [x + 6, y + 10]];
        const z = rc.linearPath(pts, base(key, { roughness: 0.3, disableMultiStroke: true }));
        g.appendChild(z);
        pieces.push(...piecesFrom(z, ink));
        break;
      }
    }
    // Decorations appear with what they belong to, just before it.
    const step = d.owner?.node !== undefined ? (stepOf.get(d.owner.node) ?? 1) : d.owner?.edge !== undefined ? edgeStep(d.owner.edge) : -0.5;
    add(step, -50 + i * 0.01, pieces, d.kind === 'text' ? 0.4 : 0.35);
  });
}
