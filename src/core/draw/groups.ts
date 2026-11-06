import type { DrawContext } from './context';
import { el } from './dom';
import { piecesFrom, type Piece } from './pieces';
import { handText } from './text';

/** Dashed hand-drawn frames around groups, with the group's name in the corner. */
export function drawGroups(ctx: DrawContext) {
  const { lay, rc, base, rand, defs, uid, textStyle, ink, groupLayer, add, stepOf } = ctx;
  lay.groups.forEach((sg, i) => {
    const { box, tab, def } = sg;
    const g = el('g', { class: 'group' }, groupLayer);
    const frame = rc.rectangle(
      box.x,
      box.y,
      box.w,
      box.h,
      base(`g-${def.id}`, { strokeLineDash: [7, 6], strokeWidth: Math.max(1, ctx.pen.width * 0.8), disableMultiStroke: true, roughness: 0.8 }),
    );
    g.appendChild(frame);
    const pieces: Piece[] = [...piecesFrom(frame, ink, true)];
    const px = lay.fontPx * 0.8;
    pieces.push(
      ...handText(g, def.label, tab.x, tab.y + tab.h / 2, { ...textStyle, px, weight: Math.min(700, textStyle.weight + 200) }, rand, defs, uid, 'start'),
    );
    // A group appears with its earliest member.
    const members = memberIds(ctx, def.id);
    const step = members.length ? Math.min(...members.map((m) => stepOf.get(m) ?? Infinity)) : 1;
    add(Number.isFinite(step) ? step : 1, -100 + i, pieces, 0.5);
  });
}

/** Every node in a group, including those in its inner groups. */
export function memberIds(ctx: DrawContext, groupId: string): string[] {
  const out = [...(ctx.doc.groups.find((g) => g.id === groupId)?.members ?? [])];
  for (const child of ctx.doc.groups.filter((g) => g.parent === groupId)) out.push(...memberIds(ctx, child.id));
  return out;
}
