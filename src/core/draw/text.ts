import { measure } from '../measure';
import { el } from './dom';
import type { Piece } from './pieces';

/* ── Handwritten text ────────────────────────────────────────────────────── */

export interface TextStyle {
  px: number;
  family: string;
  weight: number;
  color: string;
  mess: number;
}

/**
 * Writes text with a little life in every letter: each glyph gets its own
 * tilt and baseline nudge, so repeated letters never look stamped.
 */
export function handText(
  parent: Element,
  text: string,
  cx: number,
  cy: number,
  st: TextStyle,
  rand: () => number,
  defs: SVGDefsElement,
  uid: string,
  anchor: 'middle' | 'start' = 'middle',
): Piece[] {
  const lines = text.split('\n');
  const lh = st.px * 1.12;
  const top = cy - (lines.length * lh) / 2 + lh / 2;
  const pieces: Piece[] = [];
  const wobble = 0.35 + st.mess;
  lines.forEach((line, li) => {
    const y = top + li * lh;
    const chars = Array.from(line);
    const rot: string[] = [];
    const dy: string[] = [];
    let prev = 0;
    for (const _ of chars) {
      const off = (rand() - 0.5) * 2.4 * wobble;
      rot.push(((rand() - 0.5) * 9 * wobble).toFixed(1));
      dy.push((off - prev).toFixed(2));
      prev = off;
    }
    // Lines slope a touch, as a hand moving across paper does.
    const slope = (rand() - 0.5) * 2.2 * wobble;
    const g = el('g', { transform: `rotate(${slope.toFixed(2)} ${cx} ${y})` }, parent);
    const t = el(
      'text',
      {
        x: cx,
        y,
        'font-family': `'${st.family}', cursive`,
        'font-size': st.px,
        'font-weight': st.weight,
        fill: st.color,
        'text-anchor': anchor,
        'dominant-baseline': 'central',
        rotate: rot.join(' '),
        dy: dy.join(' '),
      },
      g,
    );
    t.textContent = line;
    const { w } = measure(line, st.px, st.family, st.weight);
    const x0 = anchor === 'middle' ? cx - w / 2 - 4 : cx - 4;
    const clipId = `${uid}-c${pieces.length}-${Math.round(rand() * 1e6)}`;
    const cp = el('clipPath', { id: clipId }, defs);
    const r = el('rect', { x: x0, y: y - lh, width: 0, height: lh * 2 }, cp);
    g.setAttribute('clip-path', `url(#${clipId})`);
    pieces.push({ el: g, mode: 'clip', len: w, clip: r, clipX: x0, clipW: w + 10 });
  });
  return pieces;
}

