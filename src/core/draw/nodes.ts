import { COLORS, STICKY } from '../styles';
import type { DrawContext } from './context';
import { el } from './dom';
import { nodeBox } from './geometry';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

export function drawNodes(ctx: DrawContext) {
  const { doc, textStyle, defs, rc, rand, base, ink, paper, uid, shifted, stepOf, rankInStep, add, nodeLayer, occupied } = ctx;
  /* Nodes */
  for (const def of doc.nodes) {
    const n = shifted.get(def.id)!;
    occupied.push(nodeBox(n, 4));
    const g = el('g', { transform: `translate(${n.cx.toFixed(1)} ${n.cy.toFixed(1)}) rotate(${n.rotate.toFixed(2)})` }, nodeLayer);
    const x = -n.w / 2;
    const y = -n.h / 2;
    const fillColor = def.fill ? COLORS[def.fill] : undefined;
    const o = base(`n-${def.id}`, fillColor ? { fill: fillColor, fillStyle: 'hachure', hachureGap: 7.5 } : {});
    let shape: SVGGElement | null = null;
    let labelColor = ink;
    switch (def.shape) {
      case 'box':
        shape = rc.rectangle(x, y, n.w, n.h, o);
        break;
      case 'round': {
        const r = Math.min(n.h / 2, 22);
        const d = `M ${x + r} ${y} L ${x + n.w - r} ${y} Q ${x + n.w} ${y} ${x + n.w} ${y + r} L ${x + n.w} ${y + n.h - r} Q ${x + n.w} ${y + n.h} ${x + n.w - r} ${y + n.h} L ${x + r} ${y + n.h} Q ${x} ${y + n.h} ${x} ${y + n.h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
        shape = rc.path(d, o);
        break;
      }
      case 'circle':
        shape = rc.ellipse(0, 0, n.w, n.h, o);
        break;
      case 'diamond':
        shape = rc.polygon(
          [
            [0, y],
            [n.w / 2, 0],
            [0, -y],
            [-n.w / 2, 0],
          ],
          o,
        );
        break;
      case 'cloud': {
        const bumps = 9;
        const rx = n.w / 2 - 6;
        const ry = n.h / 2 - 6;
        const a0 = rand() * Math.PI;
        let d = '';
        for (let i = 0; i <= bumps; i++) {
          const a = a0 + (i / bumps) * Math.PI * 2;
          const px = Math.cos(a) * rx;
          const py = Math.sin(a) * ry;
          if (i === 0) d += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
          else {
            const rr = ((2 * Math.PI) / bumps) * Math.max(rx, ry) * (0.42 + rand() * 0.12);
            d += ` A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`;
          }
        }
        shape = rc.path(d, o);
        break;
      }
      case 'db': {
        const ry = 10;
        const gg = el('g', {});
        gg.appendChild(rc.ellipse(0, y + ry, n.w, ry * 2, o));
        gg.appendChild(
          rc.path(
            `M ${x} ${y + ry} L ${x} ${y + n.h - ry} A ${n.w / 2} ${ry} 0 0 0 ${x + n.w} ${y + n.h - ry} L ${x + n.w} ${y + ry}`,
            base(`n-${def.id}-b`, fillColor ? { fill: fillColor, fillStyle: 'hachure' } : {}),
          ),
        );
        shape = gg;
        break;
      }
      case 'sticky': {
        const fold = 16;
        const gg = el('g', {});
        el('rect', { x: x + 4, y: y + 5, width: n.w, height: n.h, fill: 'rgba(0,0,0,0.12)', rx: 2 }, gg);
        gg.appendChild(
          rc.polygon(
            [
              [x, y],
              [x + n.w, y],
              [x + n.w, y + n.h - fold],
              [x + n.w - fold, y + n.h],
              [x, y + n.h],
            ],
            base(`n-${def.id}`, { fill: fillColor ?? STICKY, fillStyle: 'solid', stroke: '#c9b44a', strokeWidth: 1, roughness: 0.6 }),
          ),
        );
        gg.appendChild(
          rc.linearPath(
            [
              [x + n.w, y + n.h - fold],
              [x + n.w - fold + 2, y + n.h - fold + 2],
              [x + n.w - fold, y + n.h],
            ],
            base(`n-${def.id}-f`, { stroke: '#b9a33c', strokeWidth: 1, roughness: 0.5 }),
          ),
        );
        shape = gg;
        labelColor = '#2b2a26';
        break;
      }
      case 'person': {
        const gg = el('g', {});
        const top = y;
        const hr = 11;
        gg.appendChild(rc.circle(0, top + hr + 1, hr * 2, o));
        gg.appendChild(rc.line(0, top + hr * 2 + 1, 0, top + 44, o));
        gg.appendChild(rc.line(-16, top + 30, 16, top + 28, o));
        gg.appendChild(rc.line(0, top + 44, -13, top + 64, o));
        gg.appendChild(rc.line(0, top + 44, 13, top + 64, o));
        shape = gg;
        break;
      }
      case 'text':
        break;
    }
    const pieces: Piece[] = [];
    if (shape && fillColor && def.shape !== 'sticky') {
      // Hatching is a pencil fill, so keep it lighter than the outline and the label.
      shape.querySelectorAll('path').forEach((p) => {
        if (p.getAttribute('stroke') === fillColor) p.setAttribute('stroke-opacity', paper.dark ? '0.5' : '0.65');
      });
    }
    if (shape) {
      g.appendChild(shape);
      pieces.push(...piecesFrom(shape, def.shape === 'sticky' ? '#__none' : ink, def.shape === 'sticky'));
    }
    pieces.push(...handText(g, def.label, 0, n.labelDy, { ...textStyle, color: labelColor }, rand, defs, uid));
    const chars = def.label.length;
    add(stepOf.get(def.id)!, rankInStep.get(def.id)!, pieces, 0.5 + Math.min(0.6, chars * 0.025));
  }
}
