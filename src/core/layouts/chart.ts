import { measure } from '../measure';
import type { Decoration, LayoutFn, Pt } from '../scene';
import { COLORS } from '../styles';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics, warn } from './shared';

/** Round tick spacing: 1, 2, 2.5 or 5 times a power of ten, giving about `count` ticks. */
function niceStep(range: number, count: number): number {
  const raw = range / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
  return 10 * mag;
}

/** Shortest text for a tick value: no trailing zeros, at most two decimals. */
const fmt = (v: number) => String(Math.round(v * 100) / 100);

/**
 * Price charts and the marks traders draw on them. `candles` and `prices`
 * put one bar per value along the x axis; `curve` plots x,y points on a
 * number line instead (a payoff diagram). On top: `level` and `zone`
 * across the chart, `trend` lines, `buy` and `sell` arrows at a bar, and
 * `stop` and `target` lines from the trade on, with the reward to risk.
 * Nodes with `at bar,price` sit on the chart, so circles and notes work.
 */
export const chart: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'chart', { tilt: 1.5, stickyTilt: 4, jitterX: 0, jitterY: 0 });
  const { px, family, weight } = textMetrics(doc);
  const c = doc.chart;
  const deco = (d: Decoration) => scene.decorations.push(d);
  const small = px * 0.72;
  const textW = (t: string, size = small) => measure(t, size, family, weight).w;

  const curves = c.lines.filter((l) => l.points);
  const series = c.lines.filter((l) => l.values);
  const numberLine = curves.length > 0 && !c.candles.length && !series.length;
  if (curves.length && !numberLine) warn(scene, 'W-CHART-MIXED', 'A chart has either bars (candles, prices, line) or x,y curves; the curves are left out.', 'Put the payoff curves in their own chart.');

  // ── Value ranges ──────────────────────────────────────────────────────
  const bars = Math.max(
    c.candles.length,
    ...series.map((l) => l.values!.length),
    ...c.trades.map((t) => t.bar),
    ...c.trends.flatMap((t) => [t.a[0], t.b[0]]),
    ...doc.nodes.filter((n) => n.at).map((n) => Math.ceil(n.at![0])),
    numberLine ? 0 : 1,
  );
  const ys: number[] = [
    ...c.candles.flatMap((k) => [k[1], k[2]]),
    ...series.flatMap((l) => l.values!),
    ...c.levels.map((l) => l.price),
    ...c.zones.flatMap((z) => [z.from, z.to]),
    ...c.trades.map((t) => t.price),
    ...c.stops.map((s) => s.price),
    ...c.targets.map((t) => t.price),
    ...c.trends.flatMap((t) => [t.a[1], t.b[1]]),
    ...doc.nodes.filter((n) => n.at).map((n) => n.at![1]),
  ];
  const xsCurve = curves.flatMap((l) => l.points!.map((p) => p[0]));
  if (numberLine) ys.push(...curves.flatMap((l) => l.points!.map((p) => p[1])), 0);
  if (!ys.length && !numberLine) {
    warn(scene, 'W-CHART-EMPTY', 'This chart has no prices yet.', 'Add  candles 100 104 98 103, …  or  prices 100 102 101 …');
    ys.push(0, 10);
  }
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;

  // ── Frame: plot area, axes, ticks ─────────────────────────────────────
  const tickStep = niceStep(hi - lo, 5);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / tickStep) * tickStep; v <= hi + 1e-9; v += tickStep) ticks.push(Math.round(v / tickStep) * tickStep);
  const tickW = Math.max(...ticks.map((t) => textW(fmt(t))));
  const x0 = 40 + tickW + 18;
  const top = 40;
  const H = 300;
  const bottom = top + H;
  const barW = numberLine ? 0 : Math.max(14, Math.min(70, 560 / bars));
  const W = numberLine ? 500 : bars * barW;
  const xLo = numberLine ? Math.min(...xsCurve) : 0;
  const xHi = numberLine ? Math.max(...xsCurve) : 1;
  const Y = (v: number) => top + ((hi - v) / (hi - lo)) * H;
  const X = (bar: number) => (numberLine ? x0 + ((bar - xLo) / (xHi - xLo || 1)) * W : x0 + (bar - 0.5) * barW);
  const right = x0 + W + 14;
  const axisY = numberLine ? Y(0) : bottom + 6;

  deco({ kind: 'line', points: [[x0 - 12, bottom + 14], [x0 - 12, top - 22]], arrow: true, width: 1.6, owner: { step: 1 } });
  deco({ kind: 'line', points: [[x0 - 20, axisY], [right + 10, axisY]], arrow: true, width: 1.6, owner: { step: 1 } });
  for (const t of ticks) {
    const y = Y(t);
    deco({ kind: 'line', points: [[x0 - 17, y], [x0 - 7, y]], width: 1.2, owner: { step: 1 } });
    deco({ kind: 'text', x: x0 - 22 - textW(fmt(t)) / 2, y, text: fmt(t), px: small, owner: { step: 1 } });
  }
  if (numberLine) {
    const xStep = niceStep(xHi - xLo, 5);
    for (let v = Math.ceil(xLo / xStep) * xStep; v <= xHi + 1e-9; v += xStep) {
      const x = X(v);
      deco({ kind: 'line', points: [[x, axisY - 5], [x, axisY + 5]], width: 1.2, owner: { step: 1 } });
      deco({ kind: 'text', x, y: axisY + 18, text: fmt(v), px: small, owner: { step: 1 } });
    }
  } else if (c.xlabels.length) {
    const widest = Math.max(...c.xlabels.map((t) => textW(t)));
    const every = Math.max(1, Math.ceil((widest + 8) / barW));
    c.xlabels.slice(0, bars).forEach((t, i) => {
      if (i % every) return;
      deco({ kind: 'text', x: X(i + 1), y: axisY + 18, text: t, px: small, owner: { step: 1 } });
    });
  }
  if (c.axis.y) deco({ kind: 'text', x: x0 - 12, y: top - 40, text: c.axis.y, px: small, bold: true, owner: { step: 1 } });
  if (c.axis.x) deco({ kind: 'text', x: right + 10 - textW(c.axis.x) / 2, y: axisY + (numberLine || c.xlabels.length ? 40 : 22), text: c.axis.x, px: small, bold: true, owner: { step: 1 } });

  // Labels down the right-hand side, pushed apart so they never overlap.
  const side: { y: number; text: string; color?: string; step: number }[] = [];

  // ── Zones and levels (behind the prices) ──────────────────────────────
  for (const z of c.zones) {
    const y1 = Y(z.to);
    const y2 = Y(z.from);
    deco({ kind: 'box', box: { x: x0 - 4, y: y1, w: W + 8, h: Math.max(4, y2 - y1) }, fill: COLORS[z.color ?? 'yellow'] ?? COLORS.yellow, hachure: true, bare: true, owner: { step: 2 } });
    if (z.label) side.push({ y: (y1 + y2) / 2, text: z.label, color: z.color, step: 2 });
  }
  for (const l of c.levels) {
    const y = Y(l.price);
    deco({ kind: 'line', points: [[x0 - 4, y], [right, y]], dashed: true, width: 1.4, color: l.color ?? 'blue', owner: { step: 2 } });
    side.push({ y, text: l.label ?? fmt(l.price), color: l.color ?? 'blue', step: 2 });
  }

  // ── Prices ────────────────────────────────────────────────────────────
  c.candles.forEach(([o, h, l, cl], i) => {
    const x = X(i + 1);
    const up = cl >= o;
    const color = up ? 'green' : 'red';
    const bodyTop = Y(Math.max(o, cl));
    const bodyBottom = Y(Math.min(o, cl));
    const bw = Math.min(22, Math.max(6, barW * 0.58));
    deco({ kind: 'line', points: [[x, Y(h)], [x, bodyTop]], width: 1.4, color, owner: { step: 1 } });
    deco({ kind: 'line', points: [[x, bodyBottom], [x, Y(l)]], width: 1.4, color, owner: { step: 1 } });
    deco({ kind: 'box', box: { x: x - bw / 2, y: bodyTop, w: bw, h: Math.max(2, bodyBottom - bodyTop) }, color, ...(up ? {} : { fill: 'red', hachure: true }), owner: { step: 1 } });
  });
  const palette = ['blue', 'orange', 'purple', 'pink'];
  const plotLine = (pts: Pt[], color: string | undefined, label: string | undefined, step: number) => {
    if (pts.length < 2) return;
    deco({ kind: 'line', points: pts, width: 2, color, straight: true, owner: { step } });
    if (label) side.push({ y: pts[pts.length - 1][1], text: label, color, step });
  };
  series.forEach((s, k) => {
    // The first unlabelled series is the price itself, in ink; others are overlays.
    const color = s.color ?? (k === 0 && !c.candles.length && !s.label ? undefined : palette[k % palette.length]);
    plotLine(s.values!.map((v, i) => [X(i + 1), Y(v)]), color, s.label, 1);
  });
  if (numberLine) {
    curves.forEach((s, k) => {
      const pts = [...s.points!].sort((a, b) => a[0] - b[0]).map(([x, y]) => [X(x), Y(y)] as Pt);
      plotLine(pts, s.color ?? (k === 0 ? undefined : palette[(k - 1) % palette.length]), s.label, 1);
    });
  }
  for (const t of c.trends) {
    const [ax, ay] = [X(t.a[0]), Y(t.a[1])];
    const [bx, by] = [X(t.b[0]), Y(t.b[1])];
    // Run on a little past the second point, as a ruler line does.
    const k = Math.min(0.25, (right - bx) / Math.max(1, bx - ax));
    const end: Pt = [bx + (bx - ax) * k, by + (by - ay) * k];
    deco({ kind: 'line', points: [[ax, ay], end], width: 1.6, color: t.color ?? 'purple', owner: { step: 2 } });
    if (t.label) deco({ kind: 'text', x: end[0], y: end[1] - 14, text: t.label, px: small, color: t.color ?? 'purple', owner: { step: 2 } });
  }

  // ── Trades, stops and targets ─────────────────────────────────────────
  const lowAt = (bar: number, price: number) => {
    const k = c.candles[bar - 1];
    const v = series[0]?.values?.[bar - 1];
    return Math.min(price, k ? k[2] : price, v ?? price);
  };
  const highAt = (bar: number, price: number) => {
    const k = c.candles[bar - 1];
    const v = series[0]?.values?.[bar - 1];
    return Math.max(price, k ? k[1] : price, v ?? price);
  };
  for (const t of c.trades) {
    const x = X(t.bar);
    const y = Y(t.price);
    const buy = t.side === 'buy';
    const color = t.color ?? (buy ? 'green' : 'red');
    deco({ kind: 'line', points: [[x - Math.min(20, barW * 0.7) - 4, y], [x + Math.min(20, barW * 0.7) + 4, y]], width: 2.4, color, owner: { step: 3 } });
    // The arrow points at the bar from outside the prices (below the axis for a buy,
    // above the chart for a sell), so its label never sits on the candles.
    const tip = buy ? Y(lowAt(t.bar, t.price)) + 8 : Y(highAt(t.bar, t.price)) - 8;
    const tail = buy ? Math.max(tip + 30, axisY + 14) : Math.min(tip - 30, top - 30);
    deco({ kind: 'line', points: [[x, tail], [x, tip]], arrow: true, width: 2, color, owner: { step: 3 } });
    deco({ kind: 'text', x, y: tail + (buy ? 16 : -16), text: t.label ?? t.side, px: small, bold: true, color, owner: { step: 3 } });
  }
  const entry = c.trades[0];
  const fromX = entry ? X(entry.bar) : x0;
  for (const s of c.stops) {
    const y = Y(s.price);
    deco({ kind: 'line', points: [[fromX, y], [right, y]], dashed: true, width: 1.6, color: s.color ?? 'red', owner: { step: 4 } });
    side.push({ y, text: s.label ?? `stop ${fmt(s.price)}`, color: s.color ?? 'red', step: 4 });
  }
  for (const t of c.targets) {
    const y = Y(t.price);
    deco({ kind: 'line', points: [[fromX, y], [right, y]], dashed: true, width: 1.6, color: t.color ?? 'green', owner: { step: 4 } });
    side.push({ y, text: t.label ?? `target ${fmt(t.price)}`, color: t.color ?? 'green', step: 4 });
  }
  if (entry && c.stops.length && c.targets.length) {
    const risk = Math.abs(entry.price - c.stops[0].price);
    const reward = Math.abs(c.targets[0].price - entry.price);
    if (risk > 0) side.push({ y: Y(entry.price), text: `reward : risk = ${fmt(reward / risk)} : 1`, color: 'mark', step: 4 });
  }

  // Right-hand labels, top to bottom, at least a line apart.
  const gap = small * 1.25;
  side.sort((a, b) => a.y - b.y);
  for (let i = 1; i < side.length; i++) side[i].y = Math.max(side[i].y, side[i - 1].y + gap);
  for (const s of side) deco({ kind: 'text', x: right + 22, y: s.y, text: s.text, px: small, anchor: 'start', color: s.color, owner: { step: s.step } });

  // ── Nodes: placed on the chart with  at bar,price ──────────────────────
  const loose = [];
  for (const d of inOrder(doc)) {
    if (!d.at) {
      loose.push(d);
      continue;
    }
    const def = d.implicit || d.shape === 'box' ? { ...d, shape: 'text' as const } : d;
    placeNode(scene, doc, def, X(d.at[0]), Y(d.at[1]));
  }
  if (loose.length) {
    warn(scene, 'W-CHART-UNPLACED', `${loose.map((d) => d.id).join(', ')} ${loose.length === 1 ? 'has' : 'have'} no place on the chart, so ${loose.length === 1 ? 'it sits' : 'they sit'} underneath.`, 'Give each one  at <bar>,<price>');
    let x = x0;
    for (const d of loose) {
      const s = sizeDef(doc, d);
      placeNode(scene, doc, d, x + s.w / 2, axisY + 80 + s.h / 2);
      x += s.w + 30;
    }
  }

  scene.autoSteps = { nodes: new Map(doc.nodes.map((n) => [n.id, 3])) };
  fitScene(scene);
  return scene;
};
