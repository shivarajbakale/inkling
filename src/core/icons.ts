/**
 * Thirty simple icons on a 24 × 24 grid, described as pen strokes so the
 * sketch pen can draw them like everything else.
 */

export type IconPart =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'ellipse'; cx: number; cy: number; w: number; h: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'poly'; pts: [number, number][]; closed?: boolean };

const path = (d: string): IconPart => ({ t: 'path', d });
const circle = (cx: number, cy: number, r: number): IconPart => ({ t: 'circle', cx, cy, r });
const ellipse = (cx: number, cy: number, w: number, h: number): IconPart => ({ t: 'ellipse', cx, cy, w, h });
const rect = (x: number, y: number, w: number, h: number): IconPart => ({ t: 'rect', x, y, w, h });
const line = (x1: number, y1: number, x2: number, y2: number): IconPart => ({ t: 'line', x1, y1, x2, y2 });
const poly = (pts: [number, number][], closed = false): IconPart => ({ t: 'poly', pts, closed });

function star(): IconPart {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 10 : 4.2;
    pts.push([12 + Math.cos(a) * r, 12.5 + Math.sin(a) * r]);
  }
  return poly(pts, true);
}

function gear(): IconPart[] {
  const parts: IconPart[] = [circle(12, 12, 3.2), circle(12, 12, 7)];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    parts.push(line(12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10));
  }
  return parts;
}

export const ICONS: Record<string, IconPart[]> = {
  person: [circle(12, 7, 4), path('M4 21 C4 15.5 7.5 13 12 13 C16.5 13 20 15.5 20 21')],
  server: [rect(3, 3, 18, 7), rect(3, 14, 18, 7), line(6, 6.5, 9, 6.5), line(6, 17.5, 9, 17.5)],
  database: [
    ellipse(12, 5, 16, 5),
    line(4, 5, 4, 19),
    line(20, 5, 20, 19),
    path('M4 12 C4 15 20 15 20 12'),
    path('M4 19 C4 22 20 22 20 19'),
  ],
  cloud: [
    path('M7 18 H17 C20 18 22 16 22 13.5 C22 11 20 9.5 18 9.5 C17.5 6.5 15 4.5 12 4.5 C8.5 4.5 6.5 7 6.2 9.5 C3.8 9.8 2 11.5 2 14 C2 16.3 4 18 7 18 Z'),
  ],
  phone: [rect(7, 2, 10, 20), line(11, 18.5, 13, 18.5)],
  laptop: [rect(4, 5, 16, 11), line(2, 19, 22, 19)],
  lock: [rect(5, 11, 14, 10), path('M8 11 V7.5 C8 5 9.8 3 12 3 C14.2 3 16 5 16 7.5 V11')],
  key: [circle(7.5, 15.5, 4.5), line(10.7, 12.3, 20, 3), line(15.5, 7.5, 18.5, 10.5), line(18, 5, 20.5, 7.5)],
  mail: [rect(2, 5, 20, 14), poly([[2, 6], [12, 13], [22, 6]])],
  file: [path('M6 2 H14 L19 7 V22 H6 Z'), poly([[14, 2], [14, 7], [19, 7]]), line(9, 12, 16, 12), line(9, 16, 16, 16)],
  folder: [path('M3 6 V19 H21 V8 H11 L9 6 Z')],
  gear: gear(),
  chart: [line(3, 21, 21, 21), line(3, 21, 3, 3), rect(6, 13, 3, 8), rect(11, 8, 3, 13), rect(16, 11, 3, 10)],
  globe: [circle(12, 12, 9), ellipse(12, 12, 8, 18), line(3, 12, 21, 12)],
  clock: [circle(12, 12, 9), poly([[12, 6.5], [12, 12], [15.5, 14]])],
  bell: [
    path('M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L20 18 H4 Z'),
    path('M10 21 C10.5 22.2 13.5 22.2 14 21'),
    line(12, 3, 12, 5),
  ],
  cart: [poly([[2, 3], [5, 3], [7.5, 15], [18, 15], [20.5, 7], [6, 7]]), circle(9, 19.5, 1.6), circle(17, 19.5, 1.6)],
  card: [rect(2, 5, 20, 14), line(2, 10, 22, 10), line(5, 15, 10, 15)],
  chat: [path('M4 5 H20 V16 H10 L6 20 V16 H4 Z')],
  search: [circle(10.5, 10.5, 6.5), line(15.3, 15.3, 21, 21)],
  star: [star()],
  heart: [
    path('M12 20 C5 15 3 12 3 8.5 C3 6 5 4 7.5 4 C9.5 4 11 5.2 12 7 C13 5.2 14.5 4 16.5 4 C19 4 21 6 21 8.5 C21 12 19 15 12 20 Z'),
  ],
  bolt: [poly([[13, 2], [4, 14], [11, 14], [10, 22], [20, 9], [13, 9]], true)],
  bug: [
    ellipse(12, 14, 10, 13),
    circle(12, 5.5, 2.6),
    line(12, 8, 12, 20),
    line(7, 11, 3, 9),
    line(7, 15, 3, 15),
    line(7.5, 18, 3.5, 20.5),
    line(17, 11, 21, 9),
    line(17, 15, 21, 15),
    line(16.5, 18, 20.5, 20.5),
  ],
  rocket: [
    path('M12 2 C16 5 17 10 15 16 H9 C7 10 8 5 12 2 Z'),
    circle(12, 9, 1.8),
    poly([[9, 12.5], [5.5, 17], [9, 16.5]]),
    poly([[15, 12.5], [18.5, 17], [15, 16.5]]),
    poly([[10.5, 18.5], [12, 22], [13.5, 18.5]]),
  ],
  book: [
    path('M4 4 H10 C11 4 12 5 12 6 V20 C12 19 11 18 10 18 H4 Z'),
    path('M20 4 H14 C13 4 12 5 12 6 V20 C12 19 13 18 14 18 H20 Z'),
  ],
  camera: [rect(2, 7, 20, 13), circle(12, 13.5, 4), poly([[8, 7], [9.5, 4], [14.5, 4], [16, 7]])],
  code: [poly([[8, 7], [3, 12], [8, 17]]), poly([[16, 7], [21, 12], [16, 17]]), line(14, 4, 10, 20)],
  link: [
    line(9.5, 14.5, 14.5, 9.5),
    path('M9 7.5 L11 5.5 C13 3.5 16.5 3.5 18.5 5.5 C20.5 7.5 20.5 11 18.5 13 L16.5 15'),
    path('M15 16.5 L13 18.5 C11 20.5 7.5 20.5 5.5 18.5 C3.5 16.5 3.5 13 5.5 11 L7.5 9'),
  ],
  check: [poly([[4, 12.5], [9, 17.5], [20, 6.5]])],
};

export const ICON_NAMES = Object.keys(ICONS);
