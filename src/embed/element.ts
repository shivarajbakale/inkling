import { FONT_CSS_URL, HANDS, mount, PAPERS, Player, type Diagram, type Settings } from '../core';

/**
 * <inkling-diagram> — the embed. Put Inkling source inside it (or in a
 * `source` attribute) and it draws itself.
 *
 *   <inkling-diagram autoplay>
 *     a -> b : hello
 *   </inkling-diagram>
 */

const CSS = `
:host { display: block; --ink-chrome: #f3f4f0; --ink-text: #2b2d31; --ink-dim: #5d6168; --ink-accent: #4d7c0f; font: 14px/1.4 'Geist', ui-sans-serif, system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :host { --ink-chrome: #171a20; --ink-text: #f4f5f7; --ink-dim: #a9abae; --ink-accent: #c6f24e; } }
:host([theme="light"]) { --ink-chrome: #f3f4f0; --ink-text: #2b2d31; --ink-dim: #5d6168; --ink-accent: #4d7c0f; }
:host([theme="dark"]) { --ink-chrome: #171a20; --ink-text: #f4f5f7; --ink-dim: #a9abae; --ink-accent: #c6f24e; }
.frame { border-radius: 14px; overflow: hidden; background: var(--ink-chrome); }
.stage { overflow-x: auto; line-height: 0; }
.stage svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; color: var(--ink-text); min-height: 40px; box-sizing: border-box; }
.bar[hidden] { display: none; }
button { all: unset; cursor: pointer; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--ink-text); }
button:hover { background: color-mix(in oklab, var(--ink-text) 10%, transparent); }
button:focus-visible { outline: 2px solid var(--ink-accent); outline-offset: 1px; }
.dots { display: flex; gap: 5px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in oklab, var(--ink-text) 22%, transparent); padding: 0; }
.dot[data-on] { background: var(--ink-accent); }
.caption { flex: 1; min-width: 0; color: var(--ink-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand { color: var(--ink-dim); font-size: 12px; text-decoration: none; white-space: nowrap; }
.brand:hover { color: var(--ink-text); }
.err { padding: 12px 14px; color: #c02626; font: 13px ui-monospace, monospace; line-height: 1.5; white-space: pre-wrap; }
`;

const PLAY = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor"/></svg>';
const REPLAY = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2a5 5 0 1 0 5 5h-1.6A3.4 3.4 0 1 1 7 3.6V6l3.2-3.2L7 -.4z" fill="currentColor"/></svg>';

let fontsReady: Promise<unknown> | null = null;
let fontSource: string | null = FONT_CSS_URL;

/**
 * Where the handwriting fonts come from. Pass your own stylesheet URL to
 * self-host them, or null if the page already loads them.
 */
export function setFontSource(url: string | null) {
  fontSource = url;
  fontsReady = null;
}

function ensureFontCss(): Promise<void> {
  if (!fontSource) return Promise.resolve();
  const already = document.querySelector('link[data-inkling-fonts]') ||
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some((l) => l.href.includes('family=Caveat'));
  if (already) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontSource!;
    link.dataset.inklingFonts = '';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** Loads the handwriting fonts once. Drawings measure text, so they wait for this. */
export function loadHands(): Promise<unknown> {
  if (!fontsReady) {
    fontsReady = ensureFontCss()
      .then(() =>
        Promise.all(
          Object.values(HANDS).flatMap((h) => [
            document.fonts.load(`${h.weight} 20px '${h.family}'`),
            document.fonts.load(`700 20px '${h.family}'`),
          ]),
        ),
      )
      .catch(() => undefined);
  }
  return fontsReady;
}

export class InklingDiagram extends HTMLElement {
  static observedAttributes = ['source', 'paper', 'pen', 'hand', 'mess', 'seed', 'controls'];
  private root: ShadowRoot;
  private diagram: Diagram | null = null;
  private player: Player | null = null;
  private source = '';
  private io: IntersectionObserver | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.source) this.source = this.getAttribute('source') ?? dedent(this.textContent ?? '');
    loadHands().then(() => this.draw());
  }

  disconnectedCallback() {
    this.player?.destroy();
    this.io?.disconnect();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'source' && value !== null) this.source = value;
    if (this.isConnected && this.diagram) this.draw();
  }

  /** Replace the source from script. */
  set code(v: string) {
    this.source = v;
    if (this.isConnected) this.draw();
  }

  private overrides(): Partial<Settings> {
    const o: Partial<Settings> = {};
    for (const k of ['paper', 'pen', 'hand'] as const) {
      const v = this.getAttribute(k);
      if (v) o[k] = v;
    }
    const mess = this.getAttribute('mess');
    if (mess !== null && !Number.isNaN(Number(mess))) o.mess = Number(mess);
    const seed = this.getAttribute('seed');
    if (seed !== null && !Number.isNaN(Number(seed))) o.seed = Number(seed);
    return o;
  }

  private draw() {
    this.player?.destroy();
    this.root.innerHTML = `<style>${CSS}</style>
      <div class="frame" part="frame">
        <div class="stage" part="stage"></div>
        <div class="bar" part="controls">
          <button class="play" aria-label="Play">${PLAY}</button>
          <div class="dots"></div>
          <div class="caption"></div>
          <a class="brand" href="#inkling" target="_blank" rel="noopener">Inkling</a>
        </div>
      </div>`;
    const stage = this.root.querySelector('.stage')!;
    const bar = this.root.querySelector<HTMLElement>('.bar')!;
    try {
      this.diagram = mount(stage, this.source, this.overrides());
    } catch (e) {
      stage.innerHTML = `<div class="err">Inkling could not draw this: ${(e as Error).message}</div>`;
      return;
    }
    const d = this.diagram;
    (stage as HTMLElement).style.background = PAPERS[d.doc.paper]?.ground ?? '';
    d.svg.setAttribute('aria-label', d.doc.title ?? 'Hand-drawn diagram');
    const errors = d.doc.diagnostics.filter((e) => e.severity === 'error');
    if (errors.length) {
      const err = document.createElement('div');
      err.className = 'err';
      err.textContent = errors.map((e) => `Line ${e.span.line}: ${e.message}${e.hint ? ` ${e.hint}` : ''}`).join('\n');
      stage.after(err);
    }
    if (this.getAttribute('controls') === 'none') bar.hidden = true;

    const playBtn = this.root.querySelector<HTMLButtonElement>('.play')!;
    const dots = this.root.querySelector('.dots')!;
    const caption = this.root.querySelector('.caption')!;
    const multi = d.steps.length > 1;
    if (multi) {
      d.steps.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'dot';
        b.setAttribute('aria-label', `Step ${s.index}${s.caption ? `: ${s.caption}` : ''}`);
        b.addEventListener('click', () => this.player?.playStep(i));
        dots.appendChild(b);
      });
    }

    const player = new Player(d, (p) => {
      const done = p.t >= d.duration - 0.01;
      playBtn.innerHTML = p.playing ? PAUSE : done ? REPLAY : PLAY;
      playBtn.setAttribute('aria-label', p.playing ? 'Pause' : done ? 'Replay' : 'Play');
      const i = p.stepIndex;
      dots.querySelectorAll('.dot').forEach((el, k) => el.toggleAttribute('data-on', k <= i && p.t > 0));
      const s = d.steps[i];
      caption.textContent = s?.caption ? `${s.index}. ${s.caption}` : (d.doc.title ?? '');
    });
    this.player = player;
    playBtn.addEventListener('click', () => (player.playing ? player.pause() : player.play()));
    player.finish();

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.hasAttribute('autoplay') && !reduce) {
      player.seek(0);
      this.io?.disconnect();
      this.io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          player.play(true);
          this.io?.disconnect();
        }
      });
      this.io.observe(this);
      // A drawing is never left blank if it never scrolls into view.
      setTimeout(() => {
        if (player.t === 0 && !player.playing) player.finish();
      }, 6000);
    }
  }
}

function dedent(s: string): string {
  const lines = s.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length));
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n');
}

export function defineInkling() {
  if (!customElements.get('inkling-diagram')) customElements.define('inkling-diagram', InklingDiagram);
}

declare global {
  interface HTMLElementTagNameMap {
    'inkling-diagram': InklingDiagram;
  }
}
