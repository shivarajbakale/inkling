import type { Options } from 'roughjs/bin/core';
import { markTarget } from '../arrange';
import { boundaryPoint } from '../scene';
import { COLORS } from '../styles';
import type { AnnotationDef } from '../types';
import type { DrawContext } from './context';
import { el } from './dom';
import { labelBox, nodeBox, type Pt } from './geometry';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

export function drawMarks(ctx: DrawContext) {
  const { doc, textStyle, lay, defs, rc, rand, base, mark, good, paper, uid, add, markLayer, extra, stepOfTarget } = ctx;
  /* Annotations */
  doc.annotations.forEach((a: AnnotationDef, i) => {
    const n = markTarget(lay, a);
    if (!n) return;
    const g = el('g', {}, markLayer);
    const pieces: Piece[] = [];
    const mo = (key: string, more: Options = {}) =>
      base(key, { stroke: mark, strokeWidth: 2, roughness: 0.55, bowing: 0.6, disableMultiStroke: true, ...more });
    const lb = labelBox(n);
    const color = a.color ? COLORS[a.color] : undefined;

    switch (a.kind) {
      case 'circle': {
        const rx = n.w / 2 + 16;
        const ry = n.h / 2 + 13;
        const a0 = rand() * Math.PI * 2;
        const sweep = Math.PI * 2 + 0.35 + rand() * 0.35;
        const tilt = (rand() - 0.5) * 0.25;
        const pts: Pt[] = [];
        const steps = 44;
        for (let k = 0; k <= steps; k++) {
          const t = a0 + (k / steps) * sweep;
          const s = 1 + 0.06 * Math.sin(t * 1.7 + a0) + (k / steps) * 0.05;
          const ex = Math.cos(t) * rx * s;
          const ey = Math.sin(t) * ry * s;
          pts.push([n.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), n.cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
        }
        const c = rc.curve(pts, mo(`a-${i}`, color ? { stroke: color, strokeWidth: 2.4 } : {}));
        g.appendChild(c);
        pieces.push(...piecesFrom(c, color ?? mark));
        extra.push(nodeBox(n, 18));
        break;
      }
      case 'underline':
      case 'strike': {
        const y = a.kind === 'underline' ? lb.y + lb.h + 3 : lb.y + lb.h / 2 + 1;
        const x0 = lb.x - 5;
        const x1 = lb.x + lb.w + 7;
        const stroke = color ?? mark;
        const c1 = rc.curve(
          [
            [x0, y + 1.5],
            [(x0 + x1) / 2, y + (rand() - 0.5) * 3],
            [x1, y - 2],
          ],
          mo(`u-${i}`, { stroke }),
        );
        g.appendChild(c1);
        pieces.push(...piecesFrom(c1, stroke));
        if (a.kind === 'underline') {
          const c2 = rc.curve(
            [
              [x0 + 8, y + 6],
              [(x0 + x1) / 2, y + 5 + (rand() - 0.5) * 2],
              [x1 - 6, y + 3.5],
            ],
            mo(`u2-${i}`, { stroke, strokeWidth: 1.6 }),
          );
          g.appendChild(c2);
          pieces.push(...piecesFrom(c2, stroke));
        }
        break;
      }
      case 'highlight': {
        const hc = color ?? COLORS.yellow;
        const lines = n.def.label.split('\n').length;
        const lh = lb.h / lines;
        for (let k = 0; k < lines; k++) {
          const y = lb.y + lh * (k + 0.55);
          const x0 = lb.x - 6;
          const x1 = lb.x + lb.w + 6;
          const d = `M ${x0} ${y + (rand() - 0.5) * 2} Q ${(x0 + x1) / 2} ${y + (rand() - 0.5) * 4} ${x1} ${y + (rand() - 0.5) * 3}`;
          const path = el('path', {
            d,
            fill: 'none',
            stroke: hc,
            'stroke-width': lh * 0.95,
            'stroke-linecap': 'round',
            opacity: paper.dark ? 0.42 : 0.6,
            style: paper.dark ? '' : 'mix-blend-mode: multiply',
          }, g);
          pieces.push({ el: path, mode: 'stroke', len: 0 });
          // the highlight sits in the node's frame of reference
          path.setAttribute('transform', `rotate(${n.rotate.toFixed(2)} ${n.cx} ${n.cy})`);
        }
        break;
      }
      case 'cross':
      case 'check': {
        // On a node, the corner; on an arrow or group, just outside it.
        const outside = a.targetKind === 'node' ? 0 : 14;
        const bx = n.cx + n.w / 2 - 2 + outside;
        const by = n.cy - n.h / 2 + 2 - outside / 2;
        const stroke = a.kind === 'cross' ? (color ?? mark) : (color ?? good);
        if (a.kind === 'cross') {
          const l1 = rc.line(bx - 10, by - 10, bx + 10, by + 10, mo(`x1-${i}`, { stroke, strokeWidth: 2.6 }));
          const l2 = rc.line(bx + 10, by - 10, bx - 10, by + 10, mo(`x2-${i}`, { stroke, strokeWidth: 2.6 }));
          g.append(l1, l2);
          pieces.push(...piecesFrom(l1, stroke), ...piecesFrom(l2, stroke));
        } else {
          const l = rc.linearPath(
            [
              [bx - 11, by],
              [bx - 3, by + 9],
              [bx + 13, by - 13],
            ],
            mo(`ck-${i}`, { stroke, strokeWidth: 2.8 }),
          );
          g.appendChild(l);
          pieces.push(...piecesFrom(l, stroke));
        }
        break;
      }
      case 'note': {
        const placed = lay.labels.get(`note:${i}`);
        if (!placed) break;
        const text = placed.text;
        const np = placed.px;
        const best = placed.box;
        extra.push(best);
        const ncx = best.x + best.w / 2;
        const ncy = best.y + best.h / 2;
        const textPieces = handText(g, text, ncx, ncy, { ...textStyle, px: np, color: mark }, rand, defs, uid);
        // The arrow leaves the note on the side facing the node.
        const sx = Math.max(best.x - 4, Math.min(best.x + best.w + 4, n.cx));
        const sy = Math.max(best.y - 4, Math.min(best.y + best.h + 4, n.cy));
        const start: Pt = [sx === n.cx ? ncx + (n.cx - ncx) * 0.15 : sx, sy === n.cy ? ncy : sy];
        const end = boundaryPoint(n, start[0], start[1], 6) as Pt;
        const mx = (start[0] + end[0]) / 2;
        const my = (start[1] + end[1]) / 2;
        const dl = Math.hypot(end[0] - start[0], end[1] - start[1]);
        const bend = dl * 0.22 * (rand() > 0.5 ? 1 : -1);
        const ctrl: Pt = [mx - ((end[1] - start[1]) / (dl || 1)) * bend, my + ((end[0] - start[0]) / (dl || 1)) * bend];
        const arrow = rc.curve([start, ctrl, end], mo(`na-${i}`, { strokeWidth: 1.6 }));
        g.appendChild(arrow);
        const tipFrom: Pt = [ctrl[0] * 0.3 + end[0] * 0.7, ctrl[1] * 0.3 + end[1] * 0.7];
        const dx = end[0] - tipFrom[0];
        const dy = end[1] - tipFrom[1];
        const ang = Math.atan2(-dy, -dx);
        const s = 9;
        const hd = rc.linearPath(
          [
            [end[0] + Math.cos(ang + 0.5) * s, end[1] + Math.sin(ang + 0.5) * s],
            end,
            [end[0] + Math.cos(ang - 0.5) * s, end[1] + Math.sin(ang - 0.5) * s],
          ],
          mo(`nh-${i}`, { strokeWidth: 1.6, roughness: 0.3 }),
        );
        g.appendChild(hd);
        pieces.push(...textPieces, ...piecesFrom(arrow, mark), ...piecesFrom(hd, mark));
        break;
      }
    }
    const step = a.at ?? stepOfTarget(a);
    add(step, 5000 + i, pieces, a.kind === 'note' ? 0.9 : a.kind === 'highlight' ? 0.45 : 0.55);
  });
}
