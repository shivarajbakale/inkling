import { draw, type Drawing, type DrawOptions, type Item, type StepInfo } from './draw';
import { layout } from './layouts';
import { parse } from './parse';
import type { Doc, Settings } from './types';

export { parse, setDirective } from './parse';
export { layout, LAYOUTS } from './layouts';
export { checkScene, type SceneProblem } from './check';
export { describe, describeLines } from './describe';
export { ICONS, ICON_NAMES } from './icons';
export type { Scene, SceneNode, SceneEdge } from './scene';
export { PAPERS, PENS, HANDS, COLORS, FONT_CSS_URL } from './styles';
export type { Diagnostic, Doc, Settings, Span } from './types';
export { tokenize, tokenizeLine, type Token, type TokenType } from './syntax/tokens';
export type { StepInfo } from './draw';

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export interface Diagram {
  doc: Doc;
  svg: SVGSVGElement;
  steps: StepInfo[];
  duration: number;
  /** Shows the drawing as it would be `t` seconds into the draw-on animation. */
  seek(t: number): void;
  /** Serialised SVG with the drawing fully finished. */
  toSVG(): string;
  destroy(): void;
}

function prepare(items: Item[]) {
  for (const item of items) {
    let total = 0;
    for (const p of item.pieces) {
      if (p.mode === 'stroke') {
        const path = p.el as SVGPathElement;
        p.len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
        if (!p.len) p.mode = 'fade';
      }
      if (p.mode === 'fade') p.len = 24;
      if (p.mode === 'clip') p.len = (p.clipW ?? 60) * 1.4;
      total += p.len;
    }
    (item as Item & { total: number }).total = total || 1;
  }
}

function apply(items: Item[], t: number) {
  for (const item of items) {
    const total = (item as Item & { total: number }).total;
    const local = Math.min(1, Math.max(0, (t - item.start) / item.dur));
    let acc = 0;
    for (const p of item.pieces) {
      const a = acc / total;
      const b = (acc + p.len) / total;
      acc += p.len;
      const q = local >= b ? 1 : local <= a ? 0 : ease((local - a) / (b - a));
      const s = (p.el as SVGElement).style;
      if (p.mode === 'stroke') {
        if (q >= 1) {
          s.strokeDasharray = '';
          s.strokeDashoffset = '';
          s.visibility = '';
        } else {
          s.strokeDasharray = `${p.len} ${p.len}`;
          s.strokeDashoffset = String(p.len * (1 - q));
          s.visibility = q <= 0 ? 'hidden' : '';
        }
      } else if (p.mode === 'fade') {
        s.opacity = q >= 1 ? '' : String(q);
      } else if (p.clip) {
        p.clip.setAttribute('width', String((p.clipW ?? 0) * q + (q >= 1 ? 40 : 0)));
      }
    }
  }
}

export interface RenderOptions extends DrawOptions {}

export function render(
  source: string,
  overrides: Partial<Settings> = {},
  options: RenderOptions = {},
): { doc: Doc; drawing: Drawing } {
  const doc = { ...parse(source), ...overrides };
  const span = { line: 1, from: 0, to: 0 };
  const big = doc.nodes.length > LIMITS.nodes || doc.edges.length > LIMITS.edges || source.length > LIMITS.chars;
  if (big)
    doc.diagnostics.push({
      code: 'W-TOO-BIG',
      severity: 'warning',
      message: `This drawing is very large (${doc.nodes.length} nodes, ${doc.edges.length} arrows), so it is drawn without animation.`,
      span,
    });
  try {
    const lay = layout(doc);
    doc.diagnostics.push(...lay.warnings);
    return { doc, drawing: draw(doc, lay, { ...options, still: options.still || big }) };
  } catch (e) {
    // Never throw: report it and draw an empty page so the caller keeps working.
    doc.diagnostics.push({
      code: 'E-INTERNAL',
      severity: 'error',
      message: `Inkling could not draw this: ${(e as Error).message}. This is a bug; please report it with the source.`,
      span,
    });
    const empty = { ...parse(''), paper: doc.paper, pen: doc.pen, hand: doc.hand };
    return { doc, drawing: draw(empty, layout(empty), options) };
  }
}

/** Above these sizes a drawing is shown without animation. */
export const LIMITS = { nodes: 300, edges: 600, chars: 20000 };

/** Renders source into a container. The drawing starts finished; call `seek` to animate. */
export function mount(container: Element, source: string, overrides: Partial<Settings> = {}): Diagram {
  const { doc, drawing } = render(source, overrides);
  container.replaceChildren(drawing.svg);
  prepare(drawing.items);
  apply(drawing.items, Infinity);
  return {
    doc,
    svg: drawing.svg,
    steps: drawing.steps,
    duration: drawing.duration,
    seek: (t) => apply(drawing.items, t),
    toSVG: () => {
      const clone = drawing.svg.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll<SVGElement>('[style]').forEach((e) => {
        e.style.strokeDasharray = '';
        e.style.strokeDashoffset = '';
        e.style.opacity = '';
        e.style.visibility = '';
      });
      clone.querySelectorAll('clipPath rect').forEach((r) => r.setAttribute('width', '9999'));
      return new XMLSerializer().serializeToString(clone);
    },
    destroy: () => drawing.svg.remove(),
  };
}

/**
 * Plays a diagram's draw-on animation. Pauses briefly at the end of each step
 * so a caption can be read.
 */
export class Player {
  t = 0;
  playing = false;
  speed = 1;
  private raf = 0;
  private last = 0;
  private holdUntil = 0;
  private stopAt: number | null = null;
  diagram: Diagram;
  private onTick: (p: Player) => void;
  constructor(diagram: Diagram, onTick: (p: Player) => void = () => {}) {
    this.diagram = diagram;
    this.onTick = onTick;
  }

  get stepIndex(): number {
    const s = this.diagram.steps;
    for (let i = s.length - 1; i >= 0; i--) if (this.t >= s[i].start - 0.001) return i;
    return 0;
  }

  seek(t: number) {
    this.t = Math.max(0, Math.min(this.diagram.duration, t));
    this.diagram.seek(this.t);
    this.onTick(this);
  }

  play(fromStart = false) {
    if (fromStart || this.t >= this.diagram.duration - 0.01) this.seek(0);
    this.playing = true;
    this.stopAt = null;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
    this.onTick(this);
  }

  /** Plays only the given step, then stops. */
  playStep(i: number) {
    const s = this.diagram.steps[i];
    if (!s) return;
    this.seek(s.start);
    this.playing = true;
    this.stopAt = s.end;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
    this.onTick(this);
  }

  next() {
    const i = this.stepIndex;
    const s = this.diagram.steps[i];
    if (s && this.t < s.end - 0.01) this.playStep(i);
    else this.playStep(Math.min(i + 1, this.diagram.steps.length - 1));
  }

  prev() {
    const i = this.stepIndex;
    const target = Math.max(0, i - 1);
    this.pause();
    this.seek(target === 0 && i === 0 ? 0 : this.diagram.steps[target].end);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.onTick(this);
  }

  finish() {
    this.pause();
    this.seek(this.diagram.duration);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.playing) return;
    const dt = Math.min(0.1, (now - this.last) / 1000) * this.speed;
    this.last = now;
    if (now < this.holdUntil) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const before = this.stepIndex;
    let t = this.t + dt;
    if (this.stopAt !== null && t >= this.stopAt) {
      this.seek(this.stopAt);
      this.pause();
      return;
    }
    // Hold at each step boundary for a moment.
    const s = this.diagram.steps[before];
    if (s && this.t < s.end && t >= s.end && before < this.diagram.steps.length - 1) {
      t = s.end;
      this.holdUntil = now + 900 / this.speed;
    }
    this.seek(t);
    if (this.t >= this.diagram.duration) this.pause();
    else this.raf = requestAnimationFrame(this.frame);
  };
}
