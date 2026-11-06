import type { Box } from '../scene';
import { PAPERS } from '../styles';
import { el } from './dom';

/* ── Paper ───────────────────────────────────────────────────────────────── */

export function drawPaper(svg: SVGSVGElement, defs: SVGDefsElement, paper: string, vb: Box, uid: string) {
  const p = PAPERS[paper];
  el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: p.ground }, svg);
  const pat = (id: string, w: number, h: number) =>
    el('pattern', { id: `${uid}-${id}`, width: w, height: h, patternUnits: 'userSpaceOnUse', x: vb.x, y: vb.y }, defs);
  const noise = (opacity: number, color: string) => {
    const f = el('filter', { id: `${uid}-noise`, x: 0, y: 0, width: '100%', height: '100%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 2, stitchTiles: 'stitch', result: 'n' }, f);
    el('feColorMatrix', { type: 'matrix', values: `0 0 0 0 ${color} 0 0 0 0 ${color} 0 0 0 0 ${color} 0 0 0 ${opacity} 0` }, f);
    el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, filter: `url(#${uid}-noise)` }, svg);
  };
  switch (paper) {
    case 'notebook': {
      const pt = pat('lines', 8, 30);
      el('line', { x1: 0, y1: 29.5, x2: 8, y2: 29.5, stroke: '#c7d6ec', 'stroke-width': 1 }, pt);
      el('rect', { x: vb.x, y: vb.y + 50, width: vb.w, height: vb.h - 50, fill: `url(#${uid}-lines)` }, svg);
      el('line', { x1: vb.x + 18, y1: vb.y, x2: vb.x + 18, y2: vb.y + vb.h, stroke: '#eeb0ad', 'stroke-width': 1.2 }, svg);
      break;
    }
    case 'graph':
    case 'blueprint': {
      const minor = paper === 'graph' ? '#e2ebf1' : 'rgba(255,255,255,0.10)';
      const major = paper === 'graph' ? '#cbdbe6' : 'rgba(255,255,255,0.22)';
      const pt = pat('grid', 100, 100);
      for (let i = 0; i <= 100; i += 20) {
        const c = i % 100 === 0 ? major : minor;
        el('line', { x1: i, y1: 0, x2: i, y2: 100, stroke: c, 'stroke-width': 1 }, pt);
        el('line', { x1: 0, y1: i, x2: 100, y2: i, stroke: c, 'stroke-width': 1 }, pt);
      }
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-grid)` }, svg);
      if (paper === 'blueprint') noise(0.05, '1');
      break;
    }
    case 'napkin': {
      noise(0.07, '0.35');
      const pt = pat('emboss', 16, 16);
      el('circle', { cx: 8, cy: 8, r: 1.1, fill: 'rgba(120,96,60,0.10)' }, pt);
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-emboss)` }, svg);
      break;
    }
    case 'chalkboard':
      noise(0.07, '1');
      break;
    case 'whiteboard': {
      const lg = el('linearGradient', { id: `${uid}-sheen`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0 }, lg);
      el('stop', { offset: 0.5, 'stop-color': '#e9eef3', 'stop-opacity': 0.5 }, lg);
      el('stop', { offset: 1, 'stop-color': '#ffffff', 'stop-opacity': 0 }, lg);
      el('rect', { x: vb.x, y: vb.y, width: vb.w, height: vb.h, fill: `url(#${uid}-sheen)` }, svg);
      break;
    }
  }
}

