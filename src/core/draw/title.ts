import { measure } from '../measure';
import type { Box } from '../scene';
import type { DrawContext } from './context';
import { el } from './dom';
import { piecesFrom } from './pieces';
import { handText } from './text';

export function drawTitle(ctx: DrawContext) {
  const { doc, textStyle, lay, defs, rc, rand, base, mark, uid, add, content, occupied } = ctx;
  /* Title */
  let titleBox: Box | undefined;
  if (doc.title) {
    const g = el('g', { class: 'title' }, content);
    const tp = lay.fontPx * 1.55;
    const { w } = measure(doc.title, tp, lay.family, Math.min(700, lay.weight + 200));
    const cx = lay.width / 2;
    const cy = 22 + tp / 2;
    const pieces = handText(g, doc.title, cx, cy, { ...textStyle, px: tp, weight: Math.min(700, lay.weight + 200) }, rand, defs, uid);
    const y = cy + tp * 0.62;
    const ul = rc.curve(
      [
        [cx - w / 2 - 6, y + 2],
        [cx, y - 1 + (rand() - 0.5) * 3],
        [cx + w / 2 + 10, y - 3],
      ],
      base('title-ul', { stroke: mark, strokeWidth: 2, roughness: 0.6, disableMultiStroke: true }),
    );
    g.appendChild(ul);
    titleBox = { x: cx - w / 2 - 10, y: cy - tp / 2 - 4, w: w + 24, h: tp + 14 };
    occupied.push(titleBox);
    add(-1, 0, [...pieces, ...piecesFrom(ul, mark)], 0.9);
  }
  ctx.titleBox = titleBox;
}
