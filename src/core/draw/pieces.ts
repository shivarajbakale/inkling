/* ── Timeline pieces ─────────────────────────────────────────────────────── */

export interface Piece {
  el: SVGElement;
  mode: 'stroke' | 'fade' | 'clip';
  len: number;
  clip?: SVGRectElement;
  clipX?: number;
  clipW?: number;
}

export interface Item {
  step: number;
  rank: number;
  pieces: Piece[];
  dur: number;
  start: number;
}

export interface StepInfo {
  index: number;
  caption?: string;
  start: number;
  end: number;
}

export interface Drawing {
  svg: SVGSVGElement;
  items: Item[];
  steps: StepInfo[];
  duration: number;
}

/** Collects every drawn path in a group as pieces, outlines before fills. */
export function piecesFrom(g: Element, ink: string, fadeAll = false): Piece[] {
  const paths = Array.from(g.querySelectorAll('path'));
  const outline: Piece[] = [];
  const rest: Piece[] = [];
  for (const p of paths) {
    const stroke = p.getAttribute('stroke');
    const fill = p.getAttribute('fill');
    const isStroke = stroke && stroke !== 'none' && (!fill || fill === 'none');
    const piece: Piece = { el: p, mode: isStroke && !fadeAll ? 'stroke' : 'fade', len: 0 };
    if (stroke === ink) outline.push(piece);
    else rest.push(piece);
  }
  return [...outline, ...rest];
}

